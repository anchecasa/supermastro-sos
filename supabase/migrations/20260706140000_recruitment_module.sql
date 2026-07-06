-- CR-2026-RECRUITMENT-01 — Talent pool nationwide + job matching

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Enums (idempotenti)
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.talent_type as enum ('artisan', 'employee');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.availability_type as enum (
    'full_time', 'part_time', 'seasonal', 'flexible'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.organization_type as enum (
    'condominium', 'hotel', 'company', 'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.job_request_status as enum (
    'pending_review', 'open', 'shortlisting', 'matched', 'closed', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.job_candidate_status as enum (
    'invited', 'accepted', 'declined', 'selected', 'contact_unlocked'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Skills — recruitment categories (edilizia già presente)
-- ---------------------------------------------------------------------------

insert into public.skills (slug, label, sos_enabled) values
  ('saldatore', 'Saldatore', false),
  ('segretaria', 'Segretaria / amministrativo', false),
  ('receptionist', 'Receptionist', false),
  ('fattorino', 'Fattorino / consegne', false),
  ('magazziniere', 'Magazziniere', false),
  ('autista', 'Autista', false),
  ('addetto_pulizie', 'Addetto pulizie', false),
  ('cameriere', 'Cameriere / sala', false),
  ('cuoco', 'Cuoco / aiuto cucina', false),
  ('barista', 'Barista', false),
  ('portiere', 'Portiere / custode', false),
  ('manutentore', 'Manutentore condominio', false),
  ('elettricista_industriale', 'Elettricista industriale', false),
  ('operaio_generico', 'Operaio generico', false),
  ('commesso', 'Commesso / vendita', false)
on conflict (slug) do update set
  label = excluded.label,
  sos_enabled = excluded.sos_enabled;

-- ---------------------------------------------------------------------------
-- Workers — recruitment fields
-- ---------------------------------------------------------------------------

alter table public.workers
  add column if not exists talent_type public.talent_type not null default 'artisan',
  add column if not exists vat_number text,
  add column if not exists comune text,
  add column if not exists availability public.availability_type not null default 'flexible',
  add column if not exists recruitment_active boolean not null default true;

alter table public.workers drop constraint if exists workers_service_radius_km_check;
alter table public.workers add constraint workers_service_radius_km_check
  check (service_radius_km between 5 and 100);

-- ---------------------------------------------------------------------------
-- Approx CAP geocoder (nationwide MVP)
-- ---------------------------------------------------------------------------

create or replace function public.approx_geocode_cap(p_cap text)
returns extensions.geography
language plpgsql
immutable
as $$
declare
  v_prefix integer;
begin
  v_prefix := nullif(substring(trim(p_cap) from 1 for 2), '')::integer;

  return case
    when v_prefix between 0 and 9 then extensions.st_geogfromtext('SRID=4326;POINT(12.4964 41.9028)')
    when v_prefix between 10 and 19 then extensions.st_geogfromtext('SRID=4326;POINT(7.6869 45.0703)')
    when v_prefix between 20 and 29 then extensions.st_geogfromtext('SRID=4326;POINT(9.19 45.4642)')
    when v_prefix between 30 and 39 then extensions.st_geogfromtext('SRID=4326;POINT(12.3155 45.4408)')
    when v_prefix between 40 and 49 then extensions.st_geogfromtext('SRID=4326;POINT(11.2558 43.7696)')
    when v_prefix between 50 and 59 then extensions.st_geogfromtext('SRID=4326;POINT(11.3426 44.4949)')
    when v_prefix between 60 and 69 then extensions.st_geogfromtext('SRID=4326;POINT(13.3615 38.1157)')
    when v_prefix between 70 and 79 then extensions.st_geogfromtext('SRID=4326;POINT(16.8719 41.1171)')
    when v_prefix between 80 and 89 then extensions.st_geogfromtext('SRID=4326;POINT(14.2681 40.8518)')
    when v_prefix between 90 and 99 then extensions.st_geogfromtext('SRID=4326;POINT(9.1217 39.2238)')
    else extensions.st_geogfromtext('SRID=4326;POINT(12.4964 41.9028)')
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Employer organizations (datori — distinto da public.organizations B2B legacy)
-- ---------------------------------------------------------------------------

create table if not exists public.employer_organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  org_type public.organization_type not null default 'company',
  name text not null,
  referent_name text not null,
  cap text not null,
  comune text,
  phone text,
  email text not null,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employer_organizations_owner_idx on public.employer_organizations (owner_user_id);

alter table public.employer_organizations enable row level security;

drop policy if exists "employer_organizations_select_own_or_admin" on public.employer_organizations;
create policy "employer_organizations_select_own_or_admin"
  on public.employer_organizations for select to authenticated
  using (
    owner_user_id = auth.uid()
    or exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

drop policy if exists "employer_organizations_insert_own" on public.employer_organizations;
create policy "employer_organizations_insert_own"
  on public.employer_organizations for insert to authenticated
  with check (owner_user_id = auth.uid());

drop policy if exists "employer_organizations_update_own" on public.employer_organizations;
create policy "employer_organizations_update_own"
  on public.employer_organizations for update to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

drop trigger if exists employer_organizations_updated_at on public.employer_organizations;
create trigger employer_organizations_updated_at
  before update on public.employer_organizations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Job requests
-- ---------------------------------------------------------------------------

create table if not exists public.job_requests (
  id uuid primary key default gen_random_uuid(),
  employer_org_id uuid not null references public.employer_organizations (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  skill_slug text not null,
  role_title text not null,
  description text,
  cap text not null,
  comune text,
  hours_per_week integer,
  availability public.availability_type,
  search_radius_km integer not null default 30 check (search_radius_km between 5 and 100),
  status public.job_request_status not null default 'pending_review',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_requests_status_idx on public.job_requests (status, created_at desc);
create index if not exists job_requests_org_idx on public.job_requests (employer_org_id);

alter table public.job_requests enable row level security;

drop policy if exists "job_requests_select_own_or_admin" on public.job_requests;
create policy "job_requests_select_own_or_admin"
  on public.job_requests for select to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

drop policy if exists "job_requests_insert_own" on public.job_requests;
create policy "job_requests_insert_own"
  on public.job_requests for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists "job_requests_update_admin" on public.job_requests;
create policy "job_requests_update_admin"
  on public.job_requests for update to authenticated
  using (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
    or created_by = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Job candidates (shortlist + responses)
-- ---------------------------------------------------------------------------

create table if not exists public.job_candidates (
  id uuid primary key default gen_random_uuid(),
  job_request_id uuid not null references public.job_requests (id) on delete cascade,
  worker_id uuid not null references public.workers (id) on delete cascade,
  status public.job_candidate_status not null default 'invited',
  distance_km numeric(8, 2),
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (job_request_id, worker_id)
);

create index if not exists job_candidates_request_idx on public.job_candidates (job_request_id, status);
create index if not exists job_candidates_worker_idx on public.job_candidates (worker_id);

alter table public.job_candidates enable row level security;

drop policy if exists "job_candidates_select_involved" on public.job_candidates;
create policy "job_candidates_select_involved"
  on public.job_candidates for select to authenticated
  using (
    exists (
      select 1 from public.workers w
      where w.id = job_candidates.worker_id and w.user_id = auth.uid()
    )
    or exists (
      select 1 from public.job_requests jr
      where jr.id = job_candidates.job_request_id and jr.created_by = auth.uid()
    )
    or exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

drop policy if exists "job_candidates_update_worker" on public.job_candidates;
create policy "job_candidates_update_worker"
  on public.job_candidates for update to authenticated
  using (
    exists (
      select 1 from public.workers w
      where w.id = job_candidates.worker_id and w.user_id = auth.uid()
    )
  );

-- Extend contact_vault for organizations
alter table public.contact_vault drop constraint if exists contact_vault_owner_type_check;
alter table public.contact_vault add constraint contact_vault_owner_type_check
  check (owner_type in ('client', 'worker', 'employer_org'));

-- ---------------------------------------------------------------------------
-- Updated submit_worker_profile
-- ---------------------------------------------------------------------------

create or replace function public.submit_worker_profile(
  p_display_name text,
  p_bio text,
  p_photo_url text,
  p_cap text,
  p_comune text,
  p_service_radius_km integer,
  p_skill_slugs text[],
  p_talent_type public.talent_type default 'artisan',
  p_vat_number text default null,
  p_availability public.availability_type default 'flexible'
)
returns public.workers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker public.workers;
  v_skill_id uuid;
  v_slug text;
  v_has_sos_skill boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_talent_type = 'artisan'::public.talent_type then
    if p_vat_number is null or length(trim(p_vat_number)) < 11 then
      raise exception 'Partita IVA obbligatoria per artigiani';
    end if;
  end if;

  if p_service_radius_km < 5 or p_service_radius_km > 100 then
    raise exception 'Raggio operativo tra 5 e 100 km';
  end if;

  if array_length(p_skill_slugs, 1) is null or array_length(p_skill_slugs, 1) = 0 then
    raise exception 'Seleziona almeno una competenza';
  end if;

  update public.profiles
  set display_name = p_display_name, updated_at = now()
  where id = auth.uid();

  update public.workers w
  set
    bio = p_bio,
    photo_url = p_photo_url,
    cap = p_cap,
    comune = p_comune,
    service_radius_km = p_service_radius_km,
    talent_type = p_talent_type,
    vat_number = case when p_talent_type = 'artisan'::public.talent_type then trim(p_vat_number) else null end,
    availability = p_availability,
    recruitment_active = true,
    status = 'pending_verification',
    updated_at = now()
  where w.user_id = auth.uid()
  returning * into v_worker;

  if v_worker.id is null then
    raise exception 'Worker row missing';
  end if;

  delete from public.worker_skills where worker_id = v_worker.id;

  foreach v_slug in array p_skill_slugs loop
    select s.id into v_skill_id from public.skills s where s.slug = v_slug;
    if v_skill_id is not null then
      insert into public.worker_skills (worker_id, skill_id)
      values (v_worker.id, v_skill_id);
      if exists (select 1 from public.skills s where s.slug = v_slug and s.sos_enabled) then
        v_has_sos_skill := true;
      end if;
    end if;
  end loop;

  insert into public.worker_locations (worker_id, location, source)
  values (
    v_worker.id,
    public.approx_geocode_cap(p_cap),
    'cap_geocode'
  )
  on conflict (worker_id) do update set
    location = excluded.location,
    source = excluded.source,
    updated_at = now();

  return v_worker;
end;
$$;

grant execute on function public.submit_worker_profile(
  text, text, text, text, text, integer, text[], public.talent_type, text, public.availability_type
) to authenticated;

-- ---------------------------------------------------------------------------
-- Employer RPCs
-- ---------------------------------------------------------------------------

create or replace function public.submit_employer_request(
  p_org_type public.organization_type,
  p_org_name text,
  p_referent_name text,
  p_cap text,
  p_comune text,
  p_phone text,
  p_email text,
  p_skill_slug text,
  p_role_title text,
  p_description text default null,
  p_hours_per_week integer default null,
  p_availability public.availability_type default null,
  p_search_radius_km integer default 30
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_job_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.employer_organizations (
    owner_user_id, org_type, name, referent_name, cap, comune, phone, email
  )
  values (
    auth.uid(), p_org_type, p_org_name, p_referent_name, p_cap, p_comune, p_phone, p_email
  )
  returning id into v_org_id;

  insert into public.contact_vault (owner_type, owner_id, phone, email)
  values ('employer_org', v_org_id, p_phone, p_email)
  on conflict (owner_type, owner_id) do update set
    phone = excluded.phone,
    email = excluded.email,
    updated_at = now();

  insert into public.job_requests (
    employer_org_id,
    created_by,
    skill_slug,
    role_title,
    description,
    cap,
    comune,
    hours_per_week,
    availability,
    search_radius_km,
    status
  )
  values (
    v_org_id,
    auth.uid(),
    p_skill_slug,
    p_role_title,
    p_description,
    p_cap,
    p_comune,
    p_hours_per_week,
    p_availability,
    p_search_radius_km,
    'pending_review'::public.job_request_status
  )
  returning id into v_job_id;

  return v_job_id;
end;
$$;

grant execute on function public.submit_employer_request(
  public.organization_type, text, text, text, text, text, text, text, text, text, integer, public.availability_type, integer
) to authenticated;

create or replace function public.admin_build_job_shortlist(p_job_id uuid, p_limit integer default 10)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.job_requests;
  v_skill_id uuid;
  v_count integer := 0;
begin
  if not exists (select 1 from public.admin_users au where au.user_id = auth.uid()) then
    raise exception 'Admin only';
  end if;

  select * into v_job from public.job_requests where id = p_job_id;
  if v_job.id is null then
    raise exception 'Job not found';
  end if;

  select s.id into v_skill_id from public.skills s where s.slug = v_job.skill_slug;
  if v_skill_id is null then
    raise exception 'Skill not found';
  end if;

  insert into public.job_candidates (job_request_id, worker_id, distance_km, status)
  select
    v_job.id,
    w.id,
    round(
      (extensions.st_distance(
        wl.location,
        public.approx_geocode_cap(v_job.cap)
      ) / 1000.0)::numeric,
      2
    ),
    'invited'::public.job_candidate_status
  from public.workers w
  inner join public.worker_locations wl on wl.worker_id = w.id
  inner join public.worker_skills ws on ws.worker_id = w.id and ws.skill_id = v_skill_id
  where w.recruitment_active = true
    and w.status in ('verified', 'active', 'pending_verification')
    and extensions.st_dwithin(
      wl.location,
      public.approx_geocode_cap(v_job.cap),
      least(w.service_radius_km, v_job.search_radius_km) * 1000
    )
  order by extensions.st_distance(wl.location, public.approx_geocode_cap(v_job.cap))
  limit p_limit
  on conflict (job_request_id, worker_id) do nothing;

  get diagnostics v_count = row_count;

  update public.job_requests
  set status = 'open'::public.job_request_status, updated_at = now()
  where id = p_job_id;

  return v_count;
end;
$$;

grant execute on function public.admin_build_job_shortlist(uuid, integer) to authenticated;

create or replace function public.respond_job_invitation(
  p_candidate_id uuid,
  p_accept boolean
)
returns public.job_candidates
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.job_candidates;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.job_candidates jc
  set
    status = case when p_accept then 'accepted'::public.job_candidate_status else 'declined'::public.job_candidate_status end,
    responded_at = now()
  from public.workers w
  where jc.id = p_candidate_id
    and jc.worker_id = w.id
    and w.user_id = auth.uid()
    and jc.status = 'invited'::public.job_candidate_status
  returning jc.* into v_row;

  if v_row.id is null then
    raise exception 'Invitation not found or already responded';
  end if;

  return v_row;
end;
$$;

grant execute on function public.respond_job_invitation(uuid, boolean) to authenticated;

create or replace function public.admin_select_job_candidate(p_candidate_id uuid)
returns public.job_candidates
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.job_candidates;
  v_job_id uuid;
begin
  if not exists (select 1 from public.admin_users au where au.user_id = auth.uid()) then
    raise exception 'Admin only';
  end if;

  select job_request_id into v_job_id
  from public.job_candidates where id = p_candidate_id;

  update public.job_candidates
  set status = 'selected'::public.job_candidate_status
  where id = p_candidate_id and status = 'accepted'::public.job_candidate_status
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Candidate must be in accepted status';
  end if;

  update public.job_requests
  set status = 'matched'::public.job_request_status, updated_at = now()
  where id = v_job_id;

  update public.job_candidates
  set status = 'contact_unlocked'::public.job_candidate_status
  where id = p_candidate_id;

  v_row.status := 'contact_unlocked'::public.job_candidate_status;
  return v_row;
end;
$$;

grant execute on function public.admin_select_job_candidate(uuid) to authenticated;

create or replace function public.get_worker_job_invitations()
returns table (
  candidate_id uuid,
  job_id uuid,
  role_title text,
  skill_slug text,
  cap text,
  comune text,
  distance_km numeric,
  status public.job_candidate_status,
  invited_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    jc.id,
    jr.id,
    jr.role_title,
    jr.skill_slug,
    jr.cap,
    jr.comune,
    jc.distance_km,
    jc.status,
    jc.invited_at
  from public.job_candidates jc
  inner join public.job_requests jr on jr.id = jc.job_request_id
  inner join public.workers w on w.id = jc.worker_id
  where w.user_id = auth.uid()
    and jc.status in ('invited'::public.job_candidate_status, 'accepted'::public.job_candidate_status)
  order by jc.invited_at desc;
$$;

grant execute on function public.get_worker_job_invitations() to authenticated;
