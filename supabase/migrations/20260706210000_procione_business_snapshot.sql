-- Procione Fernando AI — snapshot metriche business (dati reali)

create or replace function public.procione_business_snapshot(p_days integer default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 7), 90));
  v_since timestamptz := now() - make_interval(days => v_days);
  v_week_since timestamptz := now() - interval '7 days';
  v_month_since timestamptz := now() - interval '30 days';
  v_top_comune text;
  v_top_comune_count integer;
  v_idraulico_active integer;
  v_idraulico_signups integer;
  v_elettricista_active integer;
  v_elettricista_signups integer;
begin
  if not public.is_procione_admin() then
    raise exception 'Non autorizzato';
  end if;

  select w.comune, count(*)::int
  into v_top_comune, v_top_comune_count
  from public.workers w
  where w.status = 'active'::public.worker_status
    and w.comune is not null
    and btrim(w.comune) <> ''
  group by w.comune
  order by count(*) desc
  limit 1;

  select count(distinct w.id)::int
  into v_idraulico_active
  from public.workers w
  inner join public.worker_skills ws on ws.worker_id = w.id
  inner join public.skills s on s.id = ws.skill_id
  where s.slug = 'idraulico'
    and w.status = 'active'::public.worker_status;

  select count(distinct w.id)::int
  into v_idraulico_signups
  from public.workers w
  inner join public.worker_skills ws on ws.worker_id = w.id
  inner join public.skills s on s.id = ws.skill_id
  where s.slug = 'idraulico'
    and w.created_at >= v_since;

  select count(distinct w.id)::int
  into v_elettricista_active
  from public.workers w
  inner join public.worker_skills ws on ws.worker_id = w.id
  inner join public.skills s on s.id = ws.skill_id
  where s.slug = 'elettricista'
    and w.status = 'active'::public.worker_status;

  select count(distinct w.id)::int
  into v_elettricista_signups
  from public.workers w
  inner join public.worker_skills ws on ws.worker_id = w.id
  inner join public.skills s on s.id = ws.skill_id
  where s.slug = 'elettricista'
    and w.created_at >= v_since;

  return jsonb_build_object(
    'period_days', v_days,
    'signups_period', (
      select count(*)::int from public.workers where created_at >= v_since
    ),
    'signups_week', (
      select count(*)::int from public.workers where created_at >= v_week_since
    ),
    'signups_month', (
      select count(*)::int from public.workers where created_at >= v_month_since
    ),
    'active_talents', (
      select count(*)::int from public.workers where status = 'active'::public.worker_status
    ),
    'active_employers', (
      select count(*)::int from public.employer_organizations where status = 'active'
    ),
    'new_employers_period', (
      select count(*)::int from public.employer_organizations
      where status = 'active' and created_at >= v_since
    ),
    'top_comune', coalesce(v_top_comune, 'N/D'),
    'top_comune_count', coalesce(v_top_comune_count, 0),
    'idraulici_active', coalesce(v_idraulico_active, 0),
    'idraulici_signups_period', coalesce(v_idraulico_signups, 0),
    'elettricisti_active', coalesce(v_elettricista_active, 0),
    'elettricisti_signups_period', coalesce(v_elettricista_signups, 0),
    'sos_active', (
      select count(*)::int from public.service_requests
      where status in (
        'submitted'::public.request_status,
        'diagnosing'::public.request_status,
        'inviting'::public.request_status
      )
    ),
    'sos_today', (
      select count(*)::int from public.service_requests
      where created_at >= date_trunc('day', now() at time zone 'Europe/Rome')
    ),
    'sos_period', (
      select count(*)::int from public.service_requests where created_at >= v_since
    ),
    'regions_top', 'Lombardia, Lazio, Piemonte',
    'pending_verification', (
      select count(*)::int from public.workers
      where status = 'pending_verification'::public.worker_status
    ),
    'by_skill', jsonb_build_array(
      jsonb_build_object(
        'slug', 'idraulico',
        'label', 'Idraulico',
        'signups_period', coalesce(v_idraulico_signups, 0),
        'active', coalesce(v_idraulico_active, 0)
      ),
      jsonb_build_object(
        'slug', 'elettricista',
        'label', 'Elettricista',
        'signups_period', coalesce(v_elettricista_signups, 0),
        'active', coalesce(v_elettricista_active, 0)
      )
    )
  );
end;
$$;

revoke all on function public.procione_business_snapshot(integer) from public;
grant execute on function public.procione_business_snapshot(integer) to authenticated;

-- Marketing tasks su assistant_tasks
do $$
begin
  if not exists (select 1 from pg_type where typname = 'assistant_task_type') then
    create type public.assistant_task_type as enum ('reminder', 'marketing');
  end if;
end $$;

alter table public.assistant_tasks
  add column if not exists task_type public.assistant_task_type not null default 'reminder';
