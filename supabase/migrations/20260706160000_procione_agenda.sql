-- SuperMastro Procione — agenda intelligente (admin Fernando)

create type public.assistant_appointment_color as enum ('orange', 'green', 'blue', 'purple');
create type public.assistant_appointment_source as enum ('manual', 'voice', 'google');
create type public.assistant_appointment_status as enum ('scheduled', 'completed', 'cancelled');
create type public.assistant_voice_role as enum ('user', 'assistant');
create type public.assistant_action_type as enum ('appointment', 'contact', 'task', 'query');

create table public.assistant_appointments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  location text,
  contact_name text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  color public.assistant_appointment_color not null default 'orange',
  source public.assistant_appointment_source not null default 'manual',
  status public.assistant_appointment_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index assistant_appointments_owner_starts_idx
  on public.assistant_appointments (owner_id, starts_at);

create table public.assistant_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  company text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assistant_contacts_owner_name_idx
  on public.assistant_contacts (owner_id, full_name);

create table public.assistant_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assistant_tasks_owner_due_idx
  on public.assistant_tasks (owner_id, due_at);

create table public.assistant_voice_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  role public.assistant_voice_role not null,
  content text not null,
  action_type public.assistant_action_type,
  created_at timestamptz not null default now()
);

create index assistant_voice_log_owner_created_idx
  on public.assistant_voice_log (owner_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS — solo admin (Procione)
-- ---------------------------------------------------------------------------

alter table public.assistant_appointments enable row level security;
alter table public.assistant_contacts enable row level security;
alter table public.assistant_tasks enable row level security;
alter table public.assistant_voice_log enable row level security;

create or replace function public.is_procione_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users au where au.user_id = auth.uid()
  );
$$;

revoke all on function public.is_procione_admin() from public;
grant execute on function public.is_procione_admin() to authenticated;

create policy "assistant_appointments_admin_all"
  on public.assistant_appointments for all to authenticated
  using (owner_id = auth.uid() and public.is_procione_admin())
  with check (owner_id = auth.uid() and public.is_procione_admin());

create policy "assistant_contacts_admin_all"
  on public.assistant_contacts for all to authenticated
  using (owner_id = auth.uid() and public.is_procione_admin())
  with check (owner_id = auth.uid() and public.is_procione_admin());

create policy "assistant_tasks_admin_all"
  on public.assistant_tasks for all to authenticated
  using (owner_id = auth.uid() and public.is_procione_admin())
  with check (owner_id = auth.uid() and public.is_procione_admin());

create policy "assistant_voice_log_admin_all"
  on public.assistant_voice_log for all to authenticated
  using (owner_id = auth.uid() and public.is_procione_admin())
  with check (owner_id = auth.uid() and public.is_procione_admin());

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger assistant_appointments_updated_at
  before update on public.assistant_appointments
  for each row execute function public.set_updated_at();

create trigger assistant_contacts_updated_at
  before update on public.assistant_contacts
  for each row execute function public.set_updated_at();

create trigger assistant_tasks_updated_at
  before update on public.assistant_tasks
  for each row execute function public.set_updated_at();
