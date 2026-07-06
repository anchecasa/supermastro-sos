-- Blocco D — Matching geo, inviti, match, unlock contatti, expiry

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.invitation_status as enum (
  'pending',
  'accepted',
  'rejected',
  'expired',
  'superseded'
);

-- ---------------------------------------------------------------------------
-- Request invitations (D2)
-- ---------------------------------------------------------------------------

create table public.request_invitations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  worker_id uuid not null references public.workers (id) on delete cascade,
  status public.invitation_status not null default 'pending',
  distance_km numeric(6, 2) not null,
  district_hint text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (request_id, worker_id)
);

create index request_invitations_worker_pending_idx
  on public.request_invitations (worker_id, created_at desc)
  where status = 'pending';

create index request_invitations_request_idx
  on public.request_invitations (request_id);

alter table public.request_invitations enable row level security;

create policy "invitations_select_worker_own_or_admin"
  on public.request_invitations for select to authenticated
  using (
    exists (
      select 1 from public.workers w
      where w.id = request_invitations.worker_id and w.user_id = auth.uid()
    )
    or exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Matches (D3)
-- ---------------------------------------------------------------------------

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.service_requests (id) on delete cascade,
  worker_id uuid not null references public.workers (id),
  invitation_id uuid references public.request_invitations (id),
  matched_at timestamptz not null default now()
);

create index matches_worker_idx on public.matches (worker_id, matched_at desc);

alter table public.matches enable row level security;

create policy "matches_select_participant_or_admin"
  on public.matches for select to authenticated
  using (
    exists (
      select 1 from public.service_requests sr
      where sr.id = matches.request_id and sr.client_id = auth.uid()
    )
    or exists (
      select 1 from public.workers w
      where w.id = matches.worker_id and w.user_id = auth.uid()
    )
    or exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Contact reveals audit (D4)
-- ---------------------------------------------------------------------------

create table public.contact_reveals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  viewer_user_id uuid not null references public.profiles (id),
  viewed_as text not null check (viewed_as in ('client', 'worker')),
  created_at timestamptz not null default now()
);

create index contact_reveals_match_idx on public.contact_reveals (match_id, created_at desc);

alter table public.contact_reveals enable row level security;

create policy "contact_reveals_select_own_or_admin"
  on public.contact_reveals for select to authenticated
  using (
    viewer_user_id = auth.uid()
    or exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Notification outbox (D2 — push stub)
-- ---------------------------------------------------------------------------

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers (id) on delete cascade,
  invitation_id uuid references public.request_invitations (id) on delete cascade,
  channel text not null default 'push' check (channel in ('push', 'sms')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index notification_outbox_pending_idx
  on public.notification_outbox (created_at)
  where sent_at is null;

alter table public.notification_outbox enable row level security;
-- no client policies

alter publication supabase_realtime add table public.request_invitations;

-- ---------------------------------------------------------------------------
-- Client contact vault (pre-match)
-- ---------------------------------------------------------------------------

create or replace function public.upsert_client_contact(
  p_phone text,
  p_email text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_phone is null or length(trim(p_phone)) < 8 then
    raise exception 'Telefono non valido';
  end if;

  insert into public.contact_vault (owner_type, owner_id, phone, email)
  values ('client', auth.uid(), trim(p_phone), nullif(trim(coalesce(p_email, '')), ''))
  on conflict (owner_type, owner_id)
  do update set
    phone = excluded.phone,
    email = coalesce(excluded.email, contact_vault.email),
    updated_at = now();
end;
$$;

grant execute on function public.upsert_client_contact(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- D1 — Geo shortlist + dispatch invitations
-- ---------------------------------------------------------------------------

create or replace function public.dispatch_request_invitations(p_request_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_request public.service_requests;
  v_worker record;
  v_count integer := 0;
  v_invitation_id uuid;
  v_district text;
begin
  select * into v_request
  from public.service_requests sr
  where sr.id = p_request_id
  for update;

  if v_request.id is null then
    raise exception 'Richiesta non trovata';
  end if;

  if v_request.status is distinct from 'inviting'::public.request_status then
    raise exception 'Richiesta non in stato inviting';
  end if;

  if exists (
    select 1 from public.request_invitations ri where ri.request_id = p_request_id
  ) then
    return (
      select count(*)::integer from public.request_invitations ri
      where ri.request_id = p_request_id
    );
  end if;

  select coalesce(pz.city, pz.name) into v_district
  from public.pilot_zones pz
  where pz.id = v_request.pilot_zone_id;

  for v_worker in
    select
      w.id as worker_id,
      round(
        (extensions.st_distance(wl.location, v_request.location) / 1000.0)::numeric,
        1
      ) as distance_km
    from public.workers w
    inner join public.worker_locations wl on wl.worker_id = w.id
    inner join public.worker_skills ws on ws.worker_id = w.id and ws.skill_id = v_request.skill_id
    inner join public.billing_accounts ba on ba.worker_id = w.id
    inner join public.credit_balance cb on cb.account_id = ba.id
    where w.status = 'active'::public.worker_status
      and cb.balance > 0
      and extensions.st_dwithin(
        wl.location,
        v_request.location,
        w.service_radius_km * 1000
      )
      and (
        select count(*)
        from public.request_invitations ri2
        where ri2.worker_id = w.id
          and ri2.created_at > now() - interval '2 hours'
      ) < 5
    order by
      extensions.st_distance(wl.location, v_request.location) asc,
      w.tier desc
    limit 15
  loop
    insert into public.request_invitations (
      request_id,
      worker_id,
      distance_km,
      district_hint
    )
    values (
      p_request_id,
      v_worker.worker_id,
      v_worker.distance_km,
      v_district
    )
    returning id into v_invitation_id;

    insert into public.notification_outbox (worker_id, invitation_id, payload)
    values (
      v_worker.worker_id,
      v_invitation_id,
      jsonb_build_object(
        'type', 'new_invitation',
        'request_id', p_request_id,
        'distance_km', v_worker.distance_km,
        'urgency', v_request.urgency
      )
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.dispatch_request_invitations(uuid) from public;
grant execute on function public.dispatch_request_invitations(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Update confirm_request_diagnosis → dispatch inviti
-- ---------------------------------------------------------------------------

create or replace function public.confirm_request_diagnosis(
  p_request_id uuid,
  p_skill_slug text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_skill_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.service_requests sr
    where sr.id = p_request_id
      and sr.client_id = auth.uid()
      and sr.status = 'diagnosing'::public.request_status
  ) then
    raise exception 'Conferma non disponibile';
  end if;

  if not exists (
    select 1 from public.request_diagnoses rd where rd.request_id = p_request_id
  ) then
    raise exception 'Diagnosi non ancora pronta';
  end if;

  if p_skill_slug is not null then
    select s.id into v_skill_id
    from public.skills s
    where s.slug = p_skill_slug and s.sos_enabled = true;

    if v_skill_id is null then
      raise exception 'Categoria non valida';
    end if;
  else
    select rd.skill_id into v_skill_id
    from public.request_diagnoses rd
    where rd.request_id = p_request_id;
  end if;

  update public.service_requests
  set
    status = 'inviting'::public.request_status,
    skill_id = v_skill_id,
    expires_at = now() + interval '45 minutes'
  where id = p_request_id;

  perform public.dispatch_request_invitations(p_request_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- D3 — Accept invitation (transazionale)
-- ---------------------------------------------------------------------------

create or replace function public.accept_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id uuid;
  v_request_id uuid;
  v_match_id uuid;
  v_account_id uuid;
  v_balance integer;
  v_invitation public.request_invitations;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select w.id into v_worker_id
  from public.workers w
  where w.user_id = auth.uid() and w.status = 'active'::public.worker_status;

  if v_worker_id is null then
    raise exception 'Account mastro non attivo';
  end if;

  select * into v_invitation
  from public.request_invitations ri
  where ri.id = p_invitation_id
    and ri.worker_id = v_worker_id
    and ri.status = 'pending'::public.invitation_status
  for update;

  if v_invitation.id is null then
    raise exception 'Invito non valido';
  end if;

  v_request_id := v_invitation.request_id;

  perform 1
  from public.service_requests sr
  where sr.id = v_request_id
    and sr.status = 'inviting'::public.request_status
    and sr.expires_at > now()
  for update;

  if not found then
    raise exception 'Richiesta non più disponibile';
  end if;

  if exists (select 1 from public.matches m where m.request_id = v_request_id) then
    raise exception 'Intervento già assegnato';
  end if;

  select ba.id, cb.balance into v_account_id, v_balance
  from public.billing_accounts ba
  inner join public.credit_balance cb on cb.account_id = ba.id
  where ba.worker_id = v_worker_id;

  if v_account_id is null or coalesce(v_balance, 0) < 1 then
    raise exception 'Crediti insufficienti';
  end if;

  insert into public.matches (request_id, worker_id, invitation_id)
  values (v_request_id, v_worker_id, p_invitation_id)
  returning id into v_match_id;

  update public.service_requests
  set status = 'matched'::public.request_status
  where id = v_request_id;

  insert into public.credit_ledger (account_id, amount, type, reference_id, note)
  values (v_account_id, -1, 'consume_match', v_match_id, 'accept invitation');

  update public.request_invitations
  set status = 'accepted'::public.invitation_status, responded_at = now()
  where id = p_invitation_id;

  update public.request_invitations
  set status = 'superseded'::public.invitation_status, responded_at = now()
  where request_id = v_request_id
    and id <> p_invitation_id
    and status = 'pending'::public.invitation_status;

  return v_match_id;
end;
$$;

grant execute on function public.accept_invitation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Reject invitation
-- ---------------------------------------------------------------------------

create or replace function public.reject_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select w.id into v_worker_id
  from public.workers w
  where w.user_id = auth.uid();

  update public.request_invitations
  set status = 'rejected'::public.invitation_status, responded_at = now()
  where id = p_invitation_id
    and worker_id = v_worker_id
    and status = 'pending'::public.invitation_status;

  if not found then
    raise exception 'Invito non valido';
  end if;
end;
$$;

grant execute on function public.reject_invitation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- D4 — Unlock contact (audit + vault read)
-- ---------------------------------------------------------------------------

create or replace function public.unlock_contact(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches;
  v_request public.service_requests;
  v_worker public.workers;
  v_viewer_role text;
  v_target_type text;
  v_target_id uuid;
  v_contact record;
  v_display_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_match from public.matches m where m.id = p_match_id;

  if v_match.id is null then
    raise exception 'Match non trovato';
  end if;

  select * into v_request
  from public.service_requests sr
  where sr.id = v_match.request_id and sr.status = 'matched'::public.request_status;

  if v_request.id is null then
    raise exception 'Match non attivo';
  end if;

  select * into v_worker from public.workers w where w.id = v_match.worker_id;

  if v_request.client_id = auth.uid() then
    v_viewer_role := 'client';
    v_target_type := 'worker';
    v_target_id := v_match.worker_id;
    select p.display_name into v_display_name
    from public.profiles p where p.id = v_worker.user_id;
  elsif v_worker.user_id = auth.uid() then
    v_viewer_role := 'worker';
    v_target_type := 'client';
    v_target_id := v_request.client_id;
    select p.display_name into v_display_name
    from public.profiles p where p.id = v_request.client_id;
  else
    raise exception 'Non autorizzato';
  end if;

  insert into public.contact_reveals (match_id, viewer_user_id, viewed_as)
  values (p_match_id, auth.uid(), v_viewer_role);

  select cv.phone, cv.email into v_contact
  from public.contact_vault cv
  where cv.owner_type = v_target_type and cv.owner_id = v_target_id;

  if v_contact.phone is null and v_contact.email is null then
    raise exception 'Contatto non disponibile';
  end if;

  return jsonb_build_object(
    'display_name', v_display_name,
    'phone', v_contact.phone,
    'email', v_contact.email,
    'role', v_target_type
  );
end;
$$;

grant execute on function public.unlock_contact(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Worker: signed URLs for request media post-match (D8 helper)
-- ---------------------------------------------------------------------------

create or replace function public.list_match_media_paths(p_match_id uuid)
returns table (storage_path text, mime_type text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches;
  v_request public.service_requests;
  v_worker public.workers;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_match from public.matches m where m.id = p_match_id;
  select * into v_request from public.service_requests sr where sr.id = v_match.request_id;
  select * into v_worker from public.workers w where w.id = v_match.worker_id;

  if v_match.id is null then
    raise exception 'Match non trovato';
  end if;

  if v_request.status not in ('matched'::public.request_status, 'completed'::public.request_status) then
    raise exception 'Media non disponibili';
  end if;

  if v_request.client_id <> auth.uid() and v_worker.user_id <> auth.uid() then
    raise exception 'Non autorizzato';
  end if;

  return query
  select rm.storage_path, rm.mime_type
  from public.request_media rm
  where rm.request_id = v_request.id
  order by rm.sort_order;
end;
$$;

grant execute on function public.list_match_media_paths(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- D7 — Expire inviting requests (pg_cron)
-- ---------------------------------------------------------------------------

create or replace function public.expire_inviting_requests()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.service_requests
  set status = 'expired'::public.request_status, updated_at = now()
  where status = 'inviting'::public.request_status
    and expires_at is not null
    and expires_at <= now();

  get diagnostics v_count = row_count;

  update public.request_invitations ri
  set status = 'expired'::public.invitation_status, responded_at = now()
  where ri.status = 'pending'::public.invitation_status
    and exists (
      select 1 from public.service_requests sr
      where sr.id = ri.request_id
        and sr.status = 'expired'::public.request_status
    );

  return v_count;
end;
$$;

revoke all on function public.expire_inviting_requests() from public;
grant execute on function public.expire_inviting_requests() to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where command like '%expire_inviting_requests%';

    perform cron.schedule(
      'supermastro-expire-inviting',
      '* * * * *',
      $cron$select public.expire_inviting_requests();$cron$
    );
  end if;
exception
  when others then
    raise notice 'pg_cron non disponibile: schedula expire_inviting_requests manualmente';
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancel: supersede pending invitations
-- ---------------------------------------------------------------------------

create or replace function public.cancel_service_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.service_requests
  set status = 'cancelled'::public.request_status
  where id = p_request_id
    and client_id = auth.uid()
    and status in (
      'draft'::public.request_status,
      'submitted'::public.request_status,
      'diagnosing'::public.request_status,
      'inviting'::public.request_status
    );

  if not found then
    raise exception 'Annullamento non consentito';
  end if;

  update public.request_invitations
  set status = 'expired'::public.invitation_status, responded_at = now()
  where request_id = p_request_id
    and status = 'pending'::public.invitation_status;
end;
$$;

-- ---------------------------------------------------------------------------
-- D8 — Storage: artigiano matched vede foto cliente
-- ---------------------------------------------------------------------------

create policy "request_media_storage_select_matched_worker"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'request-media'
    and exists (
      select 1
      from public.matches m
      inner join public.workers w on w.id = m.worker_id
      inner join public.service_requests sr on sr.id = m.request_id
      inner join public.request_media rm on rm.request_id = sr.id
      where w.user_id = auth.uid()
        and rm.storage_path = name
        and sr.status in ('matched'::public.request_status, 'completed'::public.request_status)
    )
  );

-- ---------------------------------------------------------------------------
-- Mark notifications sent (service role)
-- ---------------------------------------------------------------------------

create or replace function public.mark_notifications_sent(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_outbox
  set sent_at = now()
  where id = any (p_ids) and sent_at is null;
end;
$$;

revoke all on function public.mark_notifications_sent(uuid[]) from public;
grant execute on function public.mark_notifications_sent(uuid[]) to service_role;

-- ---------------------------------------------------------------------------
-- Worker invitation list (no PII / no service_requests direct access)
-- ---------------------------------------------------------------------------

create or replace function public.get_worker_pending_invitations()
returns table (
  id uuid,
  distance_km numeric,
  district_hint text,
  created_at timestamptz,
  skill_label text,
  urgency public.urgency_level
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select w.id into v_worker_id
  from public.workers w
  where w.user_id = auth.uid();

  if v_worker_id is null then
    return;
  end if;

  return query
  select
    ri.id,
    ri.distance_km,
    ri.district_hint,
    ri.created_at,
    s.label as skill_label,
    sr.urgency
  from public.request_invitations ri
  inner join public.service_requests sr on sr.id = ri.request_id
  inner join public.skills s on s.id = sr.skill_id
  where ri.worker_id = v_worker_id
    and ri.status = 'pending'::public.invitation_status
    and sr.status = 'inviting'::public.request_status
    and sr.expires_at > now()
  order by ri.created_at desc;
end;
$$;

grant execute on function public.get_worker_pending_invitations() to authenticated;
