-- SuperMastro Procione — fase 2 (Google Calendar, push, reminder)

alter table public.assistant_appointments
  add column if not exists google_event_id text,
  add column if not exists reminder_sent_at timestamptz;

create index if not exists assistant_appointments_reminder_idx
  on public.assistant_appointments (starts_at, reminder_sent_at)
  where status = 'scheduled';

create table if not exists public.assistant_google_tokens (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  calendar_id text not null default 'primary',
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, endpoint)
);

create index assistant_push_subscriptions_owner_idx
  on public.assistant_push_subscriptions (owner_id);

alter table public.assistant_google_tokens enable row level security;
alter table public.assistant_push_subscriptions enable row level security;

create policy "assistant_google_tokens_admin_all"
  on public.assistant_google_tokens for all to authenticated
  using (owner_id = auth.uid() and public.is_procione_admin())
  with check (owner_id = auth.uid() and public.is_procione_admin());

create policy "assistant_push_subscriptions_admin_all"
  on public.assistant_push_subscriptions for all to authenticated
  using (owner_id = auth.uid() and public.is_procione_admin())
  with check (owner_id = auth.uid() and public.is_procione_admin());

create trigger assistant_google_tokens_updated_at
  before update on public.assistant_google_tokens
  for each row execute function public.set_updated_at();
