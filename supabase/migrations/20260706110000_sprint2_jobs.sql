-- Sprint 2 — Scheduled jobs: SMS fallback, trial refund, retention, reconciliation

-- ---------------------------------------------------------------------------
-- G2 — SMS fallback: push non delivered entro 2 min
-- ---------------------------------------------------------------------------

create or replace function public.process_sms_fallback_queue()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
  v_sms_only boolean;
begin
  select public.get_platform_flag('sms_only_mode') into v_sms_only;

  for v_row in
    select no.id, no.worker_id, no.invitation_id, no.payload, no.retry_count
    from public.notification_outbox no
    where no.sent_at is not null
      and no.sms_sent_at is null
      and no.sms_fallback_at is null
      and no.created_at < now() - interval '2 minutes'
      and (
        v_sms_only
        or no.push_delivered_at is null
      )
    order by no.created_at
    limit 50
  loop
    update public.notification_outbox
    set sms_fallback_at = now()
    where id = v_row.id;

    insert into public.sms_delivery_log (
      outbox_id,
      worker_id,
      phone_hash,
      message_type,
      body_preview,
      status
    )
    values (
      v_row.id,
      v_row.worker_id,
      'pending-hash',
      'worker_invite',
      left(
        coalesce(v_row.payload ->> 'skill', 'intervento') || ' — SuperMastro invito',
        160
      ),
      'pending'
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.process_sms_fallback_queue() from public;
grant execute on function public.process_sms_fallback_queue() to service_role;

-- ---------------------------------------------------------------------------
-- I3 — Trial refund fine mese (0 match accettati)
-- ---------------------------------------------------------------------------

create or replace function public.process_monthly_trial_refund_candidates()
returns table (worker_id uuid, checkout_session_id text, matches_in_month bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    ba.worker_id,
    ba.trial_checkout_session_id,
    (
      select count(*)
      from public.matches m
      where m.worker_id = ba.worker_id
        and m.matched_at >= date_trunc('month', now() - interval '1 month')
        and m.matched_at < date_trunc('month', now())
    ) as matches_in_month
  from public.billing_accounts ba
  where ba.trial_checkout_session_id is not null
    and exists (
      select 1 from public.credit_ledger cl
      where cl.account_id = ba.id and cl.type = 'trial_grant'::public.credit_ledger_type
    );
end;
$$;

revoke all on function public.process_monthly_trial_refund_candidates() from public;
grant execute on function public.process_monthly_trial_refund_candidates() to service_role;

-- ---------------------------------------------------------------------------
-- I6 — Stripe reconciliation snapshot
-- ---------------------------------------------------------------------------

create or replace function public.run_billing_reconciliation()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger integer;
  v_log_id uuid;
begin
  select count(*)::integer into v_ledger
  from public.credit_ledger cl
  where cl.type in ('purchase'::public.credit_ledger_type, 'trial_grant'::public.credit_ledger_type)
    and cl.created_at > now() - interval '24 hours';

  insert into public.billing_reconciliation_log (stripe_payments, ledger_purchases, mismatches)
  values (0, v_ledger, '[]'::jsonb)
  returning id into v_log_id;

  return v_log_id;
end;
$$;

revoke all on function public.run_billing_reconciliation() from public;
grant execute on function public.run_billing_reconciliation() to service_role;

-- ---------------------------------------------------------------------------
-- J5 — Retention foto SOS 90 gg post-completed
-- ---------------------------------------------------------------------------

create or replace function public.purge_expired_sos_media()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_path text;
begin
  for v_path in
    select rm.storage_path
    from public.request_media rm
    inner join public.service_requests sr on sr.id = rm.request_id
    where sr.status = 'completed'::public.request_status
      and sr.updated_at < now() - interval '90 days'
  loop
    delete from public.request_media where storage_path = v_path;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.purge_expired_sos_media() from public;
grant execute on function public.purge_expired_sos_media() to service_role;

-- ---------------------------------------------------------------------------
-- Mark push delivered (G1)
-- ---------------------------------------------------------------------------

create or replace function public.mark_push_delivered(p_outbox_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_outbox
  set push_delivered_at = coalesce(push_delivered_at, now())
  where id = any (p_outbox_ids);
end;
$$;

revoke all on function public.mark_push_delivered(uuid[]) from public;
grant execute on function public.mark_push_delivered(uuid[]) to service_role;

-- ---------------------------------------------------------------------------
-- pg_cron jobs (se disponibile)
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where command like '%process_sms_fallback_queue%';

    perform cron.schedule(
      'supermastro-sms-fallback',
      '*/2 * * * *',
      $cron$select public.process_sms_fallback_queue();$cron$
    );

    perform cron.schedule(
      'supermastro-purge-media',
      '0 3 * * *',
      $cron$select public.purge_expired_sos_media();$cron$
    );

    perform cron.schedule(
      'supermastro-billing-reconcile',
      '0 4 * * *',
      $cron$select public.run_billing_reconciliation();$cron$
    );
  end if;
exception
  when others then
    raise notice 'pg_cron jobs non schedulati — usa API cron';
end;
$$;
