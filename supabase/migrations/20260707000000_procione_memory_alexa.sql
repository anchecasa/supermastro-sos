-- Procione: memoria utente (alias contatti, preferenze) + collegamento Alexa

create table public.assistant_contact_aliases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  alias text not null,
  resolved_name text not null,
  contact_id uuid references public.assistant_contacts (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (owner_id, alias)
);

create index assistant_contact_aliases_owner_idx
  on public.assistant_contact_aliases (owner_id);

create table public.assistant_preferences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  pref_key text not null,
  pref_value text not null,
  updated_at timestamptz not null default now(),
  unique (owner_id, pref_key)
);

create table public.assistant_alexa_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  amazon_user_id text not null,
  linked_at timestamptz not null default now(),
  unique (owner_id),
  unique (amazon_user_id)
);

create table public.assistant_alexa_link_codes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  unique (code)
);

create index assistant_alexa_link_codes_owner_idx
  on public.assistant_alexa_link_codes (owner_id, expires_at desc);

alter table public.assistant_contact_aliases enable row level security;
alter table public.assistant_preferences enable row level security;
alter table public.assistant_alexa_links enable row level security;
alter table public.assistant_alexa_link_codes enable row level security;

create policy "assistant_contact_aliases_admin_all"
  on public.assistant_contact_aliases for all to authenticated
  using (owner_id = auth.uid() and public.is_procione_admin())
  with check (owner_id = auth.uid() and public.is_procione_admin());

create policy "assistant_preferences_admin_all"
  on public.assistant_preferences for all to authenticated
  using (owner_id = auth.uid() and public.is_procione_admin())
  with check (owner_id = auth.uid() and public.is_procione_admin());

create policy "assistant_alexa_links_admin_all"
  on public.assistant_alexa_links for all to authenticated
  using (owner_id = auth.uid() and public.is_procione_admin())
  with check (owner_id = auth.uid() and public.is_procione_admin());

create policy "assistant_alexa_link_codes_admin_all"
  on public.assistant_alexa_link_codes for all to authenticated
  using (owner_id = auth.uid() and public.is_procione_admin())
  with check (owner_id = auth.uid() and public.is_procione_admin());

create trigger assistant_preferences_updated_at
  before update on public.assistant_preferences
  for each row execute function public.set_updated_at();
