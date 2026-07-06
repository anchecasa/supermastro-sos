-- Blocco A — Fondazione SuperMastro pilota v1.0
-- A2 schema · A3 PostGIS · A4 contact_vault · A5 consent_records

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('client', 'worker', 'admin');
create type public.worker_status as enum (
  'registered',
  'pending_verification',
  'verified',
  'active',
  'suspended',
  'deactivated'
);

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'client',
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Admin users (prima delle policy che lo referenziano)
-- ---------------------------------------------------------------------------

create table public.admin_users (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.admin_users au where au.user_id = auth.uid()
    )
  );

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

alter table public.admin_users enable row level security;

create policy "admin_users_select_admin_only"
  on public.admin_users for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Skills (catalogo congelato pilota)
-- ---------------------------------------------------------------------------

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sos_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.skills enable row level security;

create policy "skills_select_authenticated"
  on public.skills for select to authenticated
  using (true);

insert into public.skills (slug, label, sos_enabled) values
  ('idraulico', 'Idraulico', true),
  ('elettricista', 'Elettricista', true),
  ('fabbro', 'Fabbro / serrature', true);

-- ---------------------------------------------------------------------------
-- Workers
-- ---------------------------------------------------------------------------

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  status public.worker_status not null default 'registered',
  bio text,
  photo_url text,
  service_radius_km integer not null default 15 check (service_radius_km between 5 and 25),
  cap text,
  tier smallint not null default 1 check (tier between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workers_status_idx on public.workers (status);

alter table public.workers enable row level security;

create policy "workers_select_own_or_admin"
  on public.workers for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

create policy "workers_insert_own"
  on public.workers for insert to authenticated
  with check (user_id = auth.uid());

create policy "workers_update_own_registered"
  on public.workers for update to authenticated
  using (
    user_id = auth.uid()
    and status in ('registered', 'pending_verification')
  )
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Worker skills
-- ---------------------------------------------------------------------------

create table public.worker_skills (
  worker_id uuid not null references public.workers (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete restrict,
  primary key (worker_id, skill_id)
);

alter table public.worker_skills enable row level security;

create policy "worker_skills_select_own_or_admin"
  on public.worker_skills for select to authenticated
  using (
    exists (
      select 1 from public.workers w
      where w.id = worker_skills.worker_id and w.user_id = auth.uid()
    )
    or exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

create policy "worker_skills_mutate_own"
  on public.worker_skills for all to authenticated
  using (
    exists (
      select 1 from public.workers w
      where w.id = worker_skills.worker_id
        and w.user_id = auth.uid()
        and w.status in ('registered', 'pending_verification')
    )
  )
  with check (
    exists (
      select 1 from public.workers w
      where w.id = worker_skills.worker_id and w.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- A3 — Pilot zones + worker locations (PostGIS)
-- ---------------------------------------------------------------------------

create table public.pilot_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  is_active boolean not null default true,
  boundary extensions.geography (polygon) not null,
  created_at timestamptz not null default now()
);

create index pilot_zones_boundary_gix on public.pilot_zones using gist (boundary);

alter table public.pilot_zones enable row level security;

create policy "pilot_zones_select_active"
  on public.pilot_zones for select to authenticated
  using (is_active = true);

-- Zona pilota placeholder: Roma centro (~25 km bbox semplificato)
insert into public.pilot_zones (name, city, boundary) values (
  'Roma pilota',
  'Roma',
  extensions.st_geogfromtext(
    'SRID=4326;POLYGON((
      12.35 41.80,
      12.65 41.80,
      12.65 42.05,
      12.35 42.05,
      12.35 41.80
    ))'
  )
);

create table public.worker_locations (
  worker_id uuid primary key references public.workers (id) on delete cascade,
  location extensions.geography (point) not null,
  accuracy_m integer,
  source text not null default 'cap_geocode' check (source in ('cap_geocode', 'gps_live', 'manual')),
  updated_at timestamptz not null default now()
);

create index worker_locations_location_gix on public.worker_locations using gist (location);

alter table public.worker_locations enable row level security;

create policy "worker_locations_select_own_or_admin"
  on public.worker_locations for select to authenticated
  using (
    exists (
      select 1 from public.workers w
      where w.id = worker_locations.worker_id and w.user_id = auth.uid()
    )
    or exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

create policy "worker_locations_mutate_own"
  on public.worker_locations for all to authenticated
  using (
    exists (
      select 1 from public.workers w
      where w.id = worker_locations.worker_id and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workers w
      where w.id = worker_locations.worker_id and w.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- A4 — Contact vault (RLS deny-all — no policies)
-- ---------------------------------------------------------------------------

create table public.contact_vault (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('client', 'worker')),
  owner_id uuid not null,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_type, owner_id)
);

alter table public.contact_vault enable row level security;
-- Intentionally NO policies: authenticated/anon cannot read or write.
-- Access only via service role or SECURITY DEFINER RPC (Sprint 1 D4).

-- ---------------------------------------------------------------------------
-- A5 — Consent records
-- ---------------------------------------------------------------------------

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  purpose text not null,
  version text not null default '1.0',
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb
);

create index consent_records_user_idx on public.consent_records (user_id, purpose);

alter table public.consent_records enable row level security;

create policy "consent_select_own"
  on public.consent_records for select to authenticated
  using (user_id = auth.uid());

create policy "consent_insert_own"
  on public.consent_records for insert to authenticated
  with check (user_id = auth.uid());

create policy "consent_update_own"
  on public.consent_records for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger workers_updated_at
  before update on public.workers
  for each row execute function public.set_updated_at();

create trigger contact_vault_updated_at
  before update on public.contact_vault
  for each row execute function public.set_updated_at();

-- Signup: profile + worker row if role=worker
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  v_role := coalesce(
    (new.raw_user_meta_data ->> 'role')::public.user_role,
    'client'::public.user_role
  );

  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    v_role,
    new.raw_user_meta_data ->> 'display_name'
  );

  if v_role = 'worker'::public.user_role then
    insert into public.workers (user_id, status)
    values (new.id, 'registered'::public.worker_status);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Log consenso contrattuale post-signup (chiamata da app o trigger)
create or replace function public.log_registration_consent(
  p_purpose text,
  p_version text default '1.0',
  p_ip_hash text default null
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

  insert into public.consent_records (user_id, purpose, version, ip_hash)
  values (auth.uid(), p_purpose, p_version, p_ip_hash)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.log_registration_consent(text, text, text) to authenticated;
