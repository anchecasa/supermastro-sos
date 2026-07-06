-- Blocco E — Hardening: rate limit, admin monitor RPCs, seconda ondata

-- ---------------------------------------------------------------------------
-- E2 — Rate limit helpers
-- ---------------------------------------------------------------------------

create or replace function public.enforce_client_sos_daily_limit(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*)::integer into v_count
  from public.service_requests sr
  where sr.client_id = p_client_id
    and sr.created_at > now() - interval '1 day'
    and sr.status <> 'cancelled'::public.request_status;

  if v_count >= 3 then
    raise exception 'RATE_LIMIT: Massimo 3 richieste SOS al giorno';
  end if;
end;
$$;

create or replace function public.enforce_worker_accept_hourly_limit(p_worker_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*)::integer into v_count
  from public.credit_ledger cl
  inner join public.billing_accounts ba on ba.id = cl.account_id
  where ba.worker_id = p_worker_id
    and cl.type = 'consume_match'::public.credit_ledger_type
    and cl.created_at > now() - interval '1 hour';

  if v_count >= 10 then
    raise exception 'RATE_LIMIT: Massimo 10 accettazioni all''ora';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Patch create_sos_request with daily limit (E2)
-- ---------------------------------------------------------------------------

create or replace function public.create_sos_request(
  p_lng double precision,
  p_lat double precision,
  p_accuracy_m integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_zone jsonb;
  v_request_id uuid;
  v_point extensions.geography;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  perform public.enforce_client_sos_daily_limit(v_uid);

  v_zone := public.check_pilot_zone(p_lng, p_lat);
  if not coalesce((v_zone ->> 'in_zone')::boolean, false) then
    raise exception 'Fuori zona pilota';
  end if;

  v_point := extensions.st_setsrid(
    extensions.st_makepoint(p_lng, p_lat),
    4326
  )::extensions.geography;

  insert into public.service_requests (
    client_id,
    pilot_zone_id,
    status,
    location,
    location_accuracy_m
  )
  values (
    v_uid,
    (v_zone ->> 'zone_id')::uuid,
    'draft'::public.request_status,
    v_point,
    p_accuracy_m
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Patch accept_invitation with hourly limit (E2)
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

  perform public.enforce_worker_accept_hourly_limit(v_worker_id);

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

-- ---------------------------------------------------------------------------
-- E3 — Admin monitor (service role)
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_active_requests()
returns table (
  id uuid,
  status public.request_status,
  urgency public.urgency_level,
  skill_label text,
  client_email text,
  expires_at timestamptz,
  invitation_count bigint,
  pending_invites bigint,
  matched_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    sr.id,
    sr.status,
    sr.urgency,
    s.label as skill_label,
    coalesce(au.email, sr.client_id::text) as client_email,
    sr.expires_at,
    count(ri.id) as invitation_count,
    count(ri.id) filter (where ri.status = 'pending'::public.invitation_status) as pending_invites,
    m.matched_at,
    sr.created_at
  from public.service_requests sr
  left join public.skills s on s.id = sr.skill_id
  left join auth.users au on au.id = sr.client_id
  left join public.request_invitations ri on ri.request_id = sr.id
  left join public.matches m on m.request_id = sr.id
  where sr.status in (
    'submitted'::public.request_status,
    'diagnosing'::public.request_status,
    'inviting'::public.request_status,
    'matched'::public.request_status
  )
  group by sr.id, sr.status, sr.urgency, s.label, au.email, sr.expires_at, m.matched_at, sr.created_at
  order by sr.created_at desc
  limit 100;
end;
$$;

revoke all on function public.admin_list_active_requests() from public;
grant execute on function public.admin_list_active_requests() to service_role;

create or replace function public.admin_list_invitation_log(p_request_id uuid default null)
returns table (
  id uuid,
  request_id uuid,
  worker_name text,
  worker_status public.worker_status,
  invitation_status public.invitation_status,
  distance_km numeric,
  created_at timestamptz,
  responded_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    ri.id,
    ri.request_id,
    p.display_name as worker_name,
    w.status as worker_status,
    ri.status as invitation_status,
    ri.distance_km,
    ri.created_at,
    ri.responded_at
  from public.request_invitations ri
  inner join public.workers w on w.id = ri.worker_id
  inner join public.profiles p on p.id = w.user_id
  where p_request_id is null or ri.request_id = p_request_id
  order by ri.created_at desc
  limit 200;
end;
$$;

revoke all on function public.admin_list_invitation_log(uuid) from public;
grant execute on function public.admin_list_invitation_log(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- R1 — Seconda ondata inviti (admin, max 10 nuovi artigiani)
-- ---------------------------------------------------------------------------

create or replace function public.admin_redispatch_invitations(
  p_request_id uuid,
  p_limit integer default 10
)
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
  v_limit integer := least(greatest(p_limit, 1), 10);
begin
  select * into v_request
  from public.service_requests sr
  where sr.id = p_request_id
  for update;

  if v_request.id is null then
    raise exception 'Richiesta non trovata';
  end if;

  if v_request.status <> 'inviting'::public.request_status then
    raise exception 'Richiesta non in stato inviting';
  end if;

  if v_request.expires_at is not null and v_request.expires_at <= now() then
    raise exception 'Richiesta scaduta';
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
      and not exists (
        select 1 from public.request_invitations ri0
        where ri0.request_id = p_request_id and ri0.worker_id = w.id
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
    limit v_limit
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
        'urgency', v_request.urgency,
        'redispatch', true
      )
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.admin_redispatch_invitations(uuid, integer) from public;
grant execute on function public.admin_redispatch_invitations(uuid, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Admin audit log (base)
-- ---------------------------------------------------------------------------

create table if not exists public.supermastro_admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.supermastro_admin_audit_log enable row level security;

create or replace function public.admin_log_action(
  p_admin_email text,
  p_action text,
  p_target_type text default null,
  p_target_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.supermastro_admin_audit_log (
    admin_email,
    action,
    target_type,
    target_id,
    metadata
  )
  values (
    p_admin_email,
    p_action,
    p_target_type,
    p_target_id,
    p_metadata
  );
end;
$$;

revoke all on function public.admin_log_action(text, text, text, uuid, jsonb) from public;
grant execute on function public.admin_log_action(text, text, text, uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- E4 — Helper seed staging location
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_worker_location(
  p_worker_id uuid,
  p_lng double precision,
  p_lat double precision
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.worker_locations (worker_id, location, source)
  values (
    p_worker_id,
    extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
    'manual'
  )
  on conflict (worker_id) do update set
    location = excluded.location,
    source = excluded.source,
    updated_at = now();
end;
$$;

revoke all on function public.admin_set_worker_location(uuid, double precision, double precision) from public;
grant execute on function public.admin_set_worker_location(uuid, double precision, double precision) to service_role;
