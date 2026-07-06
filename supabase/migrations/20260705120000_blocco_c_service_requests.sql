-- Blocco C — SOS cliente: richieste, media, diagnosi AI, storage privato

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.request_status as enum (
  'draft',
  'submitted',
  'diagnosing',
  'inviting',
  'matched',
  'completed',
  'expired',
  'cancelled'
);

create type public.urgency_level as enum ('low', 'medium', 'high');

-- ---------------------------------------------------------------------------
-- Service requests
-- ---------------------------------------------------------------------------

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  pilot_zone_id uuid references public.pilot_zones (id),
  status public.request_status not null default 'draft',
  location extensions.geography (point) not null,
  location_accuracy_m integer,
  skill_id uuid references public.skills (id),
  urgency public.urgency_level,
  client_notes text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index service_requests_client_idx on public.service_requests (client_id, created_at desc);
create index service_requests_status_idx on public.service_requests (status) where status in ('inviting', 'diagnosing');

alter table public.service_requests enable row level security;

create policy "service_requests_select_own_or_admin"
  on public.service_requests for select to authenticated
  using (
    client_id = auth.uid()
    or exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

-- Mutations only via SECURITY DEFINER RPCs (no direct insert/update policies)

-- ---------------------------------------------------------------------------
-- Request diagnoses
-- ---------------------------------------------------------------------------

create table public.request_diagnoses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.service_requests (id) on delete cascade,
  skill_id uuid not null references public.skills (id),
  urgency public.urgency_level not null,
  confidence numeric(4, 3),
  summary text,
  raw_response jsonb,
  model_version text not null default 'stub-v1',
  created_at timestamptz not null default now()
);

alter table public.request_diagnoses enable row level security;

create policy "request_diagnoses_select_own_or_admin"
  on public.request_diagnoses for select to authenticated
  using (
    exists (
      select 1 from public.service_requests sr
      where sr.id = request_diagnoses.request_id and sr.client_id = auth.uid()
    )
    or exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Request media
-- ---------------------------------------------------------------------------

create table public.request_media (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null,
  file_size_bytes integer check (file_size_bytes is null or file_size_bytes > 0),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index request_media_request_idx on public.request_media (request_id, sort_order);

alter table public.request_media enable row level security;

create policy "request_media_select_own_or_admin"
  on public.request_media for select to authenticated
  using (
    exists (
      select 1 from public.service_requests sr
      where sr.id = request_media.request_id and sr.client_id = auth.uid()
    )
    or exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

create trigger service_requests_updated_at
  before update on public.service_requests
  for each row execute function public.set_updated_at();

-- Realtime: client subscribes to own request — UI uses only status field (C7)
alter publication supabase_realtime add table public.service_requests;

-- ---------------------------------------------------------------------------
-- Storage bucket (private — C2)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'request-media',
  'request-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "request_media_storage_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'request-media'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "request_media_storage_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'request-media'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "request_media_storage_delete_own_draft"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'request-media'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- RPC: check pilot zone (C1)
-- ---------------------------------------------------------------------------

create or replace function public.check_pilot_zone(
  p_lng double precision,
  p_lat double precision
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_point extensions.geography;
  v_zone record;
begin
  if p_lng is null or p_lat is null then
    raise exception 'Coordinate mancanti';
  end if;

  v_point := extensions.st_setsrid(
    extensions.st_makepoint(p_lng, p_lat),
    4326
  )::extensions.geography;

  select z.id, z.name, z.city
  into v_zone
  from public.pilot_zones z
  where z.is_active = true
    and extensions.st_covers(z.boundary, v_point)
  limit 1;

  if v_zone.id is null then
    return jsonb_build_object('in_zone', false);
  end if;

  return jsonb_build_object(
    'in_zone', true,
    'zone_id', v_zone.id,
    'zone_name', v_zone.name,
    'city', v_zone.city
  );
end;
$$;

grant execute on function public.check_pilot_zone(double precision, double precision) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: create draft SOS request
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

grant execute on function public.create_sos_request(double precision, double precision, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: log AI photo analysis consent (C3)
-- ---------------------------------------------------------------------------

create or replace function public.log_ai_analysis_consent(
  p_request_id uuid,
  p_version text default '1.0'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.service_requests sr
    where sr.id = p_request_id
      and sr.client_id = auth.uid()
      and sr.status = 'draft'::public.request_status
  ) then
    raise exception 'Richiesta non valida';
  end if;

  insert into public.consent_records (user_id, purpose, version, metadata)
  values (
    auth.uid(),
    'ai_photo_analysis',
    p_version,
    jsonb_build_object('request_id', p_request_id)
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.log_ai_analysis_consent(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: register uploaded media
-- ---------------------------------------------------------------------------

create or replace function public.register_request_media(
  p_request_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_file_size_bytes integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_media_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_storage_path !~ ('^' || v_uid::text || '/' || p_request_id::text || '/') then
    raise exception 'Percorso storage non valido';
  end if;

  if not exists (
    select 1 from public.service_requests sr
    where sr.id = p_request_id
      and sr.client_id = v_uid
      and sr.status = 'draft'::public.request_status
  ) then
    raise exception 'Richiesta non modificabile';
  end if;

  if not exists (
    select 1 from public.consent_records cr
    where cr.user_id = v_uid
      and cr.purpose = 'ai_photo_analysis'
      and cr.withdrawn_at is null
      and cr.metadata ->> 'request_id' = p_request_id::text
  ) then
    raise exception 'Consenso analisi AI mancante';
  end if;

  insert into public.request_media (
    request_id,
    storage_path,
    mime_type,
    file_size_bytes,
    sort_order
  )
  values (
    p_request_id,
    p_storage_path,
    p_mime_type,
    p_file_size_bytes,
    coalesce(
      (select count(*)::smallint from public.request_media rm where rm.request_id = p_request_id),
      0
    )
  )
  returning id into v_media_id;

  return v_media_id;
end;
$$;

grant execute on function public.register_request_media(uuid, text, text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: submit for AI diagnosis (draft → submitted → diagnosing)
-- ---------------------------------------------------------------------------

create or replace function public.submit_request_for_diagnosis(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.service_requests sr
    where sr.id = p_request_id
      and sr.client_id = auth.uid()
      and sr.status = 'draft'::public.request_status
  ) then
    raise exception 'Richiesta non inviabile';
  end if;

  if not exists (
    select 1 from public.request_media rm where rm.request_id = p_request_id
  ) then
    raise exception 'Aggiungi almeno una foto';
  end if;

  update public.service_requests
  set status = 'submitted'::public.request_status
  where id = p_request_id;

  update public.service_requests
  set status = 'diagnosing'::public.request_status
  where id = p_request_id;
end;
$$;

grant execute on function public.submit_request_for_diagnosis(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: apply diagnosis (Edge Function / service role only — C4)
-- ---------------------------------------------------------------------------

create or replace function public.apply_request_diagnosis(
  p_request_id uuid,
  p_skill_slug text,
  p_urgency public.urgency_level,
  p_confidence numeric default null,
  p_summary text default null,
  p_raw_response jsonb default null,
  p_model_version text default 'stub-v1'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_skill_id uuid;
  v_status public.request_status;
begin
  select sr.status into v_status
  from public.service_requests sr
  where sr.id = p_request_id;

  if v_status is distinct from 'diagnosing'::public.request_status then
    raise exception 'Stato richiesta non valido per diagnosi';
  end if;

  select s.id into v_skill_id
  from public.skills s
  where s.slug = p_skill_slug and s.sos_enabled = true;

  if v_skill_id is null then
    raise exception 'Skill non valida: %', p_skill_slug;
  end if;

  insert into public.request_diagnoses (
    request_id,
    skill_id,
    urgency,
    confidence,
    summary,
    raw_response,
    model_version
  )
  values (
    p_request_id,
    v_skill_id,
    p_urgency,
    p_confidence,
    p_summary,
    p_raw_response,
    p_model_version
  )
  on conflict (request_id) do update set
    skill_id = excluded.skill_id,
    urgency = excluded.urgency,
    confidence = excluded.confidence,
    summary = excluded.summary,
    raw_response = excluded.raw_response,
    model_version = excluded.model_version;

  update public.service_requests
  set skill_id = v_skill_id, urgency = p_urgency
  where id = p_request_id;
end;
$$;

revoke all on function public.apply_request_diagnosis(uuid, text, public.urgency_level, numeric, text, jsonb, text) from public;
grant execute on function public.apply_request_diagnosis(uuid, text, public.urgency_level, numeric, text, jsonb, text) to service_role;

-- ---------------------------------------------------------------------------
-- RPC: client confirms diagnosis → inviting (C6)
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
end;
$$;

grant execute on function public.confirm_request_diagnosis(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: cancel request (pre-match)
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
end;
$$;

grant execute on function public.cancel_service_request(uuid) to authenticated;
