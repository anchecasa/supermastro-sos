-- Blocco B — Billing, onboarding artigiano, admin verify

-- ---------------------------------------------------------------------------
-- Billing
-- ---------------------------------------------------------------------------

create table public.billing_accounts (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null unique references public.workers (id) on delete cascade,
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_accounts enable row level security;

create policy "billing_accounts_select_own"
  on public.billing_accounts for select to authenticated
  using (
    exists (
      select 1 from public.workers w
      where w.id = billing_accounts.worker_id and w.user_id = auth.uid()
    )
  );

create type public.credit_ledger_type as enum (
  'purchase',
  'trial_grant',
  'consume_match',
  'trial_refund',
  'admin_adjust',
  'dispute_refund'
);

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.billing_accounts (id) on delete cascade,
  amount integer not null check (amount <> 0),
  type public.credit_ledger_type not null,
  reference_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create unique index credit_ledger_consume_unique
  on public.credit_ledger (account_id, reference_id)
  where type = 'consume_match' and reference_id is not null;

create unique index credit_ledger_trial_once
  on public.credit_ledger (account_id)
  where type = 'trial_grant';

create index credit_ledger_account_idx on public.credit_ledger (account_id, created_at desc);

alter table public.credit_ledger enable row level security;

create policy "credit_ledger_select_own"
  on public.credit_ledger for select to authenticated
  using (
    exists (
      select 1
      from public.billing_accounts ba
      join public.workers w on w.id = ba.worker_id
      where ba.id = credit_ledger.account_id and w.user_id = auth.uid()
    )
  );

create view public.credit_balance as
select
  account_id,
  coalesce(sum(amount), 0)::integer as balance
from public.credit_ledger
group by account_id;

grant select on public.credit_balance to authenticated;

create table public.stripe_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
-- no client policies

-- ---------------------------------------------------------------------------
-- Worker onboarding RPCs (contact vault via SECURITY DEFINER)
-- ---------------------------------------------------------------------------

create or replace function public.upsert_worker_contact(p_phone text, p_email text)
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

  if v_worker_id is null then
    raise exception 'Worker not found';
  end if;

  insert into public.contact_vault (owner_type, owner_id, phone, email)
  values ('worker', v_worker_id, p_phone, p_email)
  on conflict (owner_type, owner_id)
  do update set
    phone = excluded.phone,
    email = excluded.email,
    updated_at = now();
end;
$$;

grant execute on function public.upsert_worker_contact(text, text) to authenticated;

create or replace function public.submit_worker_profile(
  p_display_name text,
  p_bio text,
  p_photo_url text,
  p_cap text,
  p_service_radius_km integer,
  p_skill_slugs text[]
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
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set display_name = p_display_name, updated_at = now()
  where id = auth.uid();

  update public.workers w
  set
    bio = p_bio,
    photo_url = p_photo_url,
    cap = p_cap,
    service_radius_km = p_service_radius_km,
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
    end if;
  end loop;

  insert into public.worker_locations (worker_id, location, source)
  values (
    v_worker.id,
    extensions.st_geogfromtext('SRID=4326;POINT(12.4964 41.9028)'),
    'cap_geocode'
  )
  on conflict (worker_id) do update set
    location = excluded.location,
    source = excluded.source,
    updated_at = now();

  return v_worker;
end;
$$;

grant execute on function public.submit_worker_profile(text, text, text, text, integer, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin helpers (service role / server-side email check in app)
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_worker_status(
  p_worker_id uuid,
  p_status public.worker_status,
  p_note text default null
)
returns public.workers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker public.workers;
begin
  update public.workers
  set status = p_status, updated_at = now()
  where id = p_worker_id
  returning * into v_worker;

  if v_worker.id is null then
    raise exception 'Worker not found';
  end if;

  return v_worker;
end;
$$;

-- Solo service role (Next.js admin API)
revoke all on function public.admin_set_worker_status(uuid, public.worker_status, text) from public;
grant execute on function public.admin_set_worker_status(uuid, public.worker_status, text) to service_role;

create or replace function public.grant_trial_credits(p_worker_id uuid, p_reference text default 'trial')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_balance integer;
begin
  insert into public.billing_accounts (worker_id)
  values (p_worker_id)
  on conflict (worker_id) do nothing;

  select id into v_account_id
  from public.billing_accounts
  where worker_id = p_worker_id;

  insert into public.credit_ledger (account_id, amount, type, note)
  select v_account_id, 5, 'trial_grant', p_reference
  where not exists (
    select 1 from public.credit_ledger cl
    where cl.account_id = v_account_id and cl.type = 'trial_grant'
  );

  select coalesce(sum(amount), 0)::integer into v_balance
  from public.credit_ledger
  where account_id = v_account_id;

  if v_balance > 0 then
    update public.workers
    set status = 'active', updated_at = now()
    where id = p_worker_id and status in ('verified', 'active');
  end if;

  return v_balance;
end;
$$;

revoke all on function public.grant_trial_credits(uuid, text) from public;
grant execute on function public.grant_trial_credits(uuid, text) to service_role;

create trigger billing_accounts_updated_at
  before update on public.billing_accounts
  for each row execute function public.set_updated_at();

-- Estende policy workers: verified può vedere proprio stato
create policy "workers_update_verified_billing"
  on public.workers for update to authenticated
  using (user_id = auth.uid() and status in ('verified', 'active'))
  with check (user_id = auth.uid());
