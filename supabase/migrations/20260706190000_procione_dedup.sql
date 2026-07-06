-- Procione: dedup contatti/appuntamenti + preferenze push

alter table public.assistant_contacts
  add column if not exists normalized_name text;

alter table public.assistant_appointments
  add column if not exists contact_id uuid references public.assistant_contacts (id) on delete set null;

create index if not exists assistant_contacts_owner_normalized_idx
  on public.assistant_contacts (owner_id, normalized_name);

create index if not exists assistant_appointments_owner_contact_idx
  on public.assistant_appointments (owner_id, contact_id, starts_at);

-- backfill normalized_name
update public.assistant_contacts
set normalized_name = lower(trim(regexp_replace(full_name, '\s+', ' ', 'g')))
where normalized_name is null;

alter type public.assistant_action_type add value if not exists 'multi';
alter type public.assistant_action_type add value if not exists 'call';
alter type public.assistant_action_type add value if not exists 'whatsapp';

create table if not exists public.assistant_user_prefs (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  push_auto_enabled boolean not null default true,
  call_consent boolean not null default false,
  whatsapp_consent boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.assistant_user_prefs enable row level security;

create policy "assistant_user_prefs_admin_all"
  on public.assistant_user_prefs for all to authenticated
  using (owner_id = auth.uid() and public.is_procione_admin())
  with check (owner_id = auth.uid() and public.is_procione_admin());

create trigger assistant_user_prefs_updated_at
  before update on public.assistant_user_prefs
  for each row execute function public.set_updated_at();
