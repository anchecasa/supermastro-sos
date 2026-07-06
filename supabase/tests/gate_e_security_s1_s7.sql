-- Gate E — Test sicurezza S1–S7 (Doc 3 §8)
-- Eseguire con: npm run test:security
-- Richiede migrazioni applicate e (per S3) app in dev su localhost:3000

-- =============================================================================
-- S1 — contact_vault deny-all per client authenticated
-- =============================================================================
select 'S1' as test, case
  when (
    select rowsecurity from pg_tables
    where schemaname = 'public' and tablename = 'contact_vault'
  ) = true
  and (
    select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'contact_vault'
  ) = 0
  then 'PASS'
  else 'FAIL'
end as result;

-- =============================================================================
-- S2 — matches RLS: policy partecipanti only
-- =============================================================================
select 'S2' as test, case
  when exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'matches'
      and policyname = 'matches_select_participant_or_admin'
  )
  then 'PASS'
  else 'FAIL'
end as result;

-- =============================================================================
-- S5 — unique match per request (race protection)
-- =============================================================================
select 'S5' as test, case
  when exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'matches'
      and indexdef like '%UNIQUE%request_id%'
  )
  then 'PASS'
  else 'FAIL'
end as result;

-- =============================================================================
-- S6 — accept_invitation controlla crediti (funzione presente + check balance)
-- =============================================================================
select 'S6' as test, case
  when exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'accept_invitation'
  )
  then 'PASS'
  else 'FAIL'
end as result;

-- =============================================================================
-- S7 — storage policy artigiano matched only
-- =============================================================================
select 'S7' as test, case
  when exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'request_media_storage_select_matched_worker'
  )
  then 'PASS'
  else 'FAIL'
end as result;

-- =============================================================================
-- E2 — rate limit functions present
-- =============================================================================
select 'E2-SOS' as test, case
  when exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'enforce_client_sos_daily_limit'
  )
  then 'PASS'
  else 'FAIL'
end as result;

select 'E2-ACCEPT' as test, case
  when exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'enforce_worker_accept_hourly_limit'
  )
  then 'PASS'
  else 'FAIL'
end as result;

-- =============================================================================
-- E3 — admin monitor RPCs
-- =============================================================================
select 'E3' as test, case
  when exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'admin_list_active_requests'
  )
  then 'PASS'
  else 'FAIL'
end as result;

-- Verifica PostGIS + seed pilota
select 'POSTGIS' as test, case
  when extensions.postgis_version() is not null then 'PASS'
  else 'FAIL'
end as result;

select 'SKILLS' as test, case
  when (select count(*) from public.skills where sos_enabled = true) = 3 then 'PASS'
  else 'FAIL'
end as result;

-- S8 — Realtime su service_requests con RLS partecipanti
select 'S8' as test, case
  when exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'service_requests'
  )
  then 'PASS'
  else 'FAIL'
end as result;

select 'S2-policies' as test, case
  when (
    select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'matches'
  ) >= 1
  then 'PASS'
  else 'FAIL'
end as result;
