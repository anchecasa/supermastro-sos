-- Sprint 2 — Core: notifiche SMS, dispute, billing paid, GDPR, platform settings

-- ---------------------------------------------------------------------------
-- Platform settings
-- ---------------------------------------------------------------------------

create table public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value) values
  ('pilot_public', 'false'::jsonb),
  ('sms_only_mode', 'false'::jsonb)
on conflict (key) do nothing;

alter table public.platform_settings enable row level security;

create or replace function public.get_platform_flag(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((value)::boolean, false)
  from public.platform_settings
  where key = p_key;
$$;

grant execute on function public.get_platform_flag(text) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- G1 — Push / SMS delivery tracking on outbox
-- ---------------------------------------------------------------------------

alter table public.notification_outbox
  add column if not exists push_sent_at timestamptz,
  add column if not exists push_delivered_at timestamptz,
  add column if not exists push_opened_at timestamptz,
  add column if not exists sms_sent_at timestamptz,
  add column if not exists sms_fallback_at timestamptz,
  add column if not exists retry_count smallint not null default 0,
  add column if not exists last_error text;

create table public.sms_delivery_log (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid references public.notification_outbox (id) on delete set null,
  worker_id uuid references public.workers (id) on delete set null,
  client_user_id uuid references public.profiles (id) on delete set null,
  phone_hash text not null,
  message_type text not null check (message_type in ('worker_invite', 'client_match')),
  body_preview text not null,
  provider text not null default 'twilio',
  provider_sid text,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

create index sms_delivery_log_created_idx on public.sms_delivery_log (created_at desc);

alter table public.sms_delivery_log enable row level security;

-- ---------------------------------------------------------------------------
-- H — Disputes
-- ---------------------------------------------------------------------------

create type public.dispute_type as enum (
  'd1_no_show',
  'd2_wrong_category',
  'd3_wrong_contact',
  'd4_fraud'
);

create type public.dispute_status as enum (
  'open',
  'under_review',
  'resolved_client',
  'resolved_worker',
  'inconclusive',
  'closed'
);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  request_id uuid not null references public.service_requests (id) on delete cascade,
  opened_by uuid not null references public.profiles (id),
  opener_role text not null check (opener_role in ('client', 'worker', 'admin')),
  type public.dispute_type not null,
  status public.dispute_status not null default 'open',
  description text not null check (char_length(description) >= 20),
  resolution_note text check (resolution_note is null or char_length(resolution_note) >= 50),
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  refund_granted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index disputes_status_idx on public.disputes (status, created_at desc);
create index disputes_match_idx on public.disputes (match_id);

alter table public.disputes enable row level security;

create policy "disputes_select_participant_or_admin"
  on public.disputes for select to authenticated
  using (
    opened_by = auth.uid()
    or exists (
      select 1 from public.matches m
      join public.service_requests sr on sr.id = m.request_id
      join public.workers w on w.id = m.worker_id
      where m.id = disputes.match_id
        and (sr.client_id = auth.uid() or w.user_id = auth.uid())
    )
    or exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

create trigger disputes_updated_at
  before update on public.disputes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- I — Billing extensions
-- ---------------------------------------------------------------------------

alter table public.billing_accounts
  add column if not exists stripe_card_fingerprint text,
  add column if not exists trial_checkout_session_id text,
  add column if not exists inactive_billing_at timestamptz;

create unique index billing_accounts_card_fingerprint_idx
  on public.billing_accounts (stripe_card_fingerprint)
  where stripe_card_fingerprint is not null;

create table public.billing_reconciliation_log (
  id uuid primary key default gen_random_uuid(),
  run_date date not null default current_date,
  stripe_payments integer not null default 0,
  ledger_purchases integer not null default 0,
  mismatches jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.billing_reconciliation_log enable row level security;

-- ---------------------------------------------------------------------------
-- RPC: open dispute (H1/H2)
-- ---------------------------------------------------------------------------

create or replace function public.open_dispute(
  p_match_id uuid,
  p_type public.dispute_type,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches;
  v_request public.service_requests;
  v_worker public.workers;
  v_role text;
  v_id uuid;
  v_hours numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if char_length(trim(p_description)) < 20 then
    raise exception 'Descrizione troppo breve (min 20 caratteri)';
  end if;

  select * into v_match from public.matches m where m.id = p_match_id;
  select * into v_request from public.service_requests sr where sr.id = v_match.request_id;
  select * into v_worker from public.workers w where w.id = v_match.worker_id;

  if v_match.id is null then
    raise exception 'Match non trovato';
  end if;

  v_hours := extract(epoch from (now() - v_match.matched_at)) / 3600.0;

  if v_request.client_id = auth.uid() then
    v_role := 'client';
  elsif v_worker.user_id = auth.uid() then
    v_role := 'worker';
  else
    raise exception 'Non autorizzato';
  end if;

  if p_type = 'd1_no_show'::public.dispute_type then
    if v_role <> 'client' then
      raise exception 'Solo il cliente può aprire no-show';
    end if;
    if v_hours > 48 then
      raise exception 'Finestra 48 ore scaduta';
    end if;
  elsif p_type in ('d2_wrong_category'::public.dispute_type, 'd3_wrong_contact'::public.dispute_type) then
    if v_hours > 2 then
      raise exception 'Finestra 2 ore scaduta';
    end if;
  end if;

  if exists (
    select 1 from public.disputes d
    where d.match_id = p_match_id and d.status not in ('closed'::public.dispute_status, 'resolved_client'::public.dispute_status, 'resolved_worker'::public.dispute_status)
  ) then
    raise exception 'Dispute già aperta su questo match';
  end if;

  insert into public.disputes (
    match_id, request_id, opened_by, opener_role, type, description, status
  )
  values (
    p_match_id, v_request.id, auth.uid(), v_role, p_type, trim(p_description), 'open'::public.dispute_status
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.open_dispute(uuid, public.dispute_type, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: admin refund credit (H4) — max 2/mese/artigiano
-- ---------------------------------------------------------------------------

create or replace function public.admin_refund_credit(
  p_worker_id uuid,
  p_reference_id uuid,
  p_note text,
  p_admin_email text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_refunds_month integer;
  v_balance integer;
begin
  if char_length(trim(coalesce(p_note, ''))) < 50 then
    raise exception 'Motivazione obbligatoria (min 50 caratteri)';
  end if;

  select ba.id into v_account_id
  from public.billing_accounts ba
  where ba.worker_id = p_worker_id;

  if v_account_id is null then
    raise exception 'Billing account non trovato';
  end if;

  select count(*)::integer into v_refunds_month
  from public.credit_ledger cl
  where cl.account_id = v_account_id
    and cl.type = 'dispute_refund'::public.credit_ledger_type
    and cl.created_at > date_trunc('month', now());

  if v_refunds_month >= 2 then
    raise exception 'Limite 2 refund dispute/mese per artigiano raggiunto';
  end if;

  insert into public.credit_ledger (account_id, amount, type, reference_id, note)
  values (v_account_id, 1, 'dispute_refund', p_reference_id, p_note);

  insert into public.supermastro_admin_audit_log (admin_email, action, target_type, target_id, metadata)
  values (
    p_admin_email,
    'dispute_refund',
    'worker',
    p_worker_id,
    jsonb_build_object('reference_id', p_reference_id, 'note', p_note)
  );

  select coalesce(sum(amount), 0)::integer into v_balance
  from public.credit_ledger where account_id = v_account_id;

  return v_balance;
end;
$$;

revoke all on function public.admin_refund_credit(uuid, uuid, text, text) from public;
grant execute on function public.admin_refund_credit(uuid, uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- RPC: admin resolve dispute (H3/H6)
-- ---------------------------------------------------------------------------

create or replace function public.admin_resolve_dispute(
  p_dispute_id uuid,
  p_status public.dispute_status,
  p_resolution_note text,
  p_refund_worker boolean,
  p_admin_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dispute public.disputes;
  v_worker_id uuid;
begin
  if char_length(trim(coalesce(p_resolution_note, ''))) < 50 then
    raise exception 'Motivazione obbligatoria (min 50 caratteri)';
  end if;

  select * into v_dispute from public.disputes d where d.id = p_dispute_id for update;

  if v_dispute.id is null then
    raise exception 'Dispute non trovata';
  end if;

  select m.worker_id into v_worker_id
  from public.matches m where m.id = v_dispute.match_id;

  update public.disputes
  set
    status = p_status,
    resolution_note = p_resolution_note,
    resolved_at = now(),
    refund_granted = p_refund_worker,
    updated_at = now()
  where id = p_dispute_id;

  if p_refund_worker then
    perform public.admin_refund_credit(
      v_worker_id,
      p_dispute_id,
      p_resolution_note,
      p_admin_email
    );
  end if;

  insert into public.supermastro_admin_audit_log (admin_email, action, target_type, target_id, metadata)
  values (
    p_admin_email,
    'resolve_dispute',
    'dispute',
    p_dispute_id,
    jsonb_build_object('status', p_status, 'refund', p_refund_worker)
  );
end;
$$;

revoke all on function public.admin_resolve_dispute(uuid, public.dispute_status, text, boolean, text) from public;
grant execute on function public.admin_resolve_dispute(uuid, public.dispute_status, text, boolean, text) to service_role;

-- ---------------------------------------------------------------------------
-- RPC: admin cancel match + refund (H6)
-- ---------------------------------------------------------------------------

create or replace function public.admin_cancel_match(
  p_match_id uuid,
  p_reason text,
  p_admin_email text,
  p_refund_credit boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches;
  v_worker_id uuid;
begin
  if char_length(trim(coalesce(p_reason, ''))) < 50 then
    raise exception 'Motivazione obbligatoria (min 50 caratteri)';
  end if;

  select * into v_match from public.matches m where m.id = p_match_id for update;
  v_worker_id := v_match.worker_id;

  update public.service_requests
  set status = 'cancelled'::public.request_status
  where id = v_match.request_id;

  if p_refund_credit then
    perform public.admin_refund_credit(v_worker_id, p_match_id, p_reason, p_admin_email);
  end if;

  insert into public.supermastro_admin_audit_log (admin_email, action, target_type, target_id, metadata)
  values (p_admin_email, 'cancel_match', 'match', p_match_id, jsonb_build_object('reason', p_reason));
end;
$$;

revoke all on function public.admin_cancel_match(uuid, text, text, boolean) from public;
grant execute on function public.admin_cancel_match(uuid, text, text, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- I — Grant paid package credits
-- ---------------------------------------------------------------------------

create or replace function public.grant_paid_credits(
  p_worker_id uuid,
  p_reference text,
  p_amount integer default 5
)
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

  select id into v_account_id from public.billing_accounts where worker_id = p_worker_id;

  insert into public.credit_ledger (account_id, amount, type, note)
  values (v_account_id, p_amount, 'purchase', p_reference);

  update public.workers
  set status = 'active', updated_at = now()
  where id = p_worker_id and status in ('verified', 'active');

  select coalesce(sum(amount), 0)::integer into v_balance
  from public.credit_ledger where account_id = v_account_id;

  return v_balance;
end;
$$;

revoke all on function public.grant_paid_credits(uuid, text, integer) from public;
grant execute on function public.grant_paid_credits(uuid, text, integer) to service_role;

create or replace function public.record_trial_card_fingerprint(
  p_worker_id uuid,
  p_fingerprint text,
  p_session_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_fingerprint is null then
    return;
  end if;

  if exists (
    select 1 from public.billing_accounts ba
    where ba.stripe_card_fingerprint = p_fingerprint
      and ba.worker_id <> p_worker_id
  ) then
    raise exception 'Trial già utilizzato con questa carta';
  end if;

  update public.billing_accounts
  set
    stripe_card_fingerprint = p_fingerprint,
    trial_checkout_session_id = p_session_id,
    updated_at = now()
  where worker_id = p_worker_id;
end;
$$;

revoke all on function public.record_trial_card_fingerprint(uuid, text, text) from public;
grant execute on function public.record_trial_card_fingerprint(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- J — Account deletion + export
-- ---------------------------------------------------------------------------

create or replace function public.request_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set display_name = 'Utente eliminato', updated_at = now()
  where id = v_uid;

  update public.contact_vault
  set phone = null, email = null, updated_at = now()
  where owner_type = 'client' and owner_id = v_uid;

  update public.workers w
  set status = 'deactivated', bio = null, photo_url = null, updated_at = now()
  where w.user_id = v_uid;

  update public.consent_records
  set withdrawn_at = now()
  where user_id = v_uid and withdrawn_at is null;

  insert into public.supermastro_admin_audit_log (admin_email, action, target_type, target_id, metadata)
  values ('self-service', 'account_deletion_requested', 'profile', v_uid, '{}'::jsonb);
end;
$$;

grant execute on function public.request_account_deletion() to authenticated;

create or replace function public.export_user_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select jsonb_build_object(
    'profile', (select to_jsonb(p) from public.profiles p where p.id = v_uid),
    'consents', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from public.consent_records c where c.user_id = v_uid),
    'service_requests', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', sr.id, 'status', sr.status, 'created_at', sr.created_at
      )), '[]'::jsonb)
      from public.service_requests sr where sr.client_id = v_uid
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.export_user_data() to authenticated;

create or replace function public.log_marketing_consent(p_granted boolean)
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

  if p_granted then
    insert into public.consent_records (user_id, purpose, version, metadata)
    values (auth.uid(), 'marketing', '1.0', '{"opt_in":true}'::jsonb)
    returning id into v_id;
  else
    update public.consent_records
    set withdrawn_at = now()
    where user_id = auth.uid() and purpose = 'marketing' and withdrawn_at is null;
  end if;

  return v_id;
end;
$$;

grant execute on function public.log_marketing_consent(boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin platform flags (G6 / L6)
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_platform_flag(
  p_key text,
  p_value boolean,
  p_admin_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.platform_settings (key, value, updated_at)
  values (p_key, to_jsonb(p_value), now())
  on conflict (key) do update set value = excluded.value, updated_at = now();

  insert into public.supermastro_admin_audit_log (admin_email, action, target_type, metadata)
  values (p_admin_email, 'set_platform_flag', 'platform_settings', jsonb_build_object('key', p_key, 'value', p_value));
end;
$$;

revoke all on function public.admin_set_platform_flag(text, boolean, text) from public;
grant execute on function public.admin_set_platform_flag(text, boolean, text) to service_role;

-- ---------------------------------------------------------------------------
-- Admin disputes list
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_disputes()
returns table (
  id uuid,
  type public.dispute_type,
  status public.dispute_status,
  description text,
  opener_role text,
  match_id uuid,
  created_at timestamptz,
  worker_name text,
  client_email text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    d.id,
    d.type,
    d.status,
    d.description,
    d.opener_role,
    d.match_id,
    d.created_at,
    pw.display_name as worker_name,
    coalesce(au.email, sr.client_id::text) as client_email
  from public.disputes d
  inner join public.matches m on m.id = d.match_id
  inner join public.service_requests sr on sr.id = d.request_id
  inner join public.workers w on w.id = m.worker_id
  inner join public.profiles pw on pw.id = w.user_id
  left join auth.users au on au.id = sr.client_id
  where d.status in ('open'::public.dispute_status, 'under_review'::public.dispute_status)
  order by d.created_at asc;
end;
$$;

revoke all on function public.admin_list_disputes() from public;
grant execute on function public.admin_list_disputes() to service_role;

-- ---------------------------------------------------------------------------
-- K2 — Pilot metrics
-- ---------------------------------------------------------------------------

create or replace function public.admin_get_pilot_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'requests_today', (
      select count(*) from public.service_requests
      where created_at > date_trunc('day', now())
    ),
    'requests_7d', (
      select count(*) from public.service_requests
      where created_at > now() - interval '7 days'
    ),
    'matched_7d', (
      select count(*) from public.service_requests
      where status = 'matched'::public.request_status
        and updated_at > now() - interval '7 days'
    ),
    'match_rate_7d', (
      select round(
        100.0 * count(*) filter (where status = 'matched'::public.request_status)
        / nullif(count(*), 0),
        1
      )
      from public.service_requests
      where created_at > now() - interval '7 days'
        and status not in ('draft'::public.request_status, 'cancelled'::public.request_status)
    ),
    'active_workers', (
      select count(*) from public.workers where status = 'active'::public.worker_status
    ),
    'open_disputes', (
      select count(*) from public.disputes
      where status in ('open'::public.dispute_status, 'under_review'::public.dispute_status)
    ),
    'sms_sent_24h', (
      select count(*) from public.sms_delivery_log
      where created_at > now() - interval '24 hours'
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_get_pilot_metrics() from public;
grant execute on function public.admin_get_pilot_metrics() to service_role;
