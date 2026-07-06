-- Admin dashboard — aggregati per settore, situazione operativa, moderazione

-- Stato sospeso per annunci recruitment
alter type public.job_request_status add value if not exists 'suspended';

-- ---------------------------------------------------------------------------
-- Situazione operativa (barra pill + badge urgenze)
-- ---------------------------------------------------------------------------

create or replace function public.admin_dashboard_situation()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object(
    'pending_verification', (
      select count(*) from public.workers
      where status = 'pending_verification'::public.worker_status
    ),
    'sos_active', (
      select count(*) from public.service_requests
      where status in (
        'submitted'::public.request_status,
        'diagnosing'::public.request_status,
        'inviting'::public.request_status
      )
    ),
    'jobs_pending_review', (
      select count(*) from public.job_requests
      where status = 'pending_review'::public.job_request_status
    ),
    'open_disputes', (
      select count(*) from public.disputes
      where status in ('open'::public.dispute_status, 'under_review'::public.dispute_status)
    ),
    'suspended_workers', (
      select count(*) from public.workers
      where status = 'suspended'::public.worker_status
    ),
    'active_workers', (
      select count(*) from public.workers
      where status = 'active'::public.worker_status
    ),
    'open_jobs', (
      select count(*) from public.job_requests
      where status in (
        'open'::public.job_request_status,
        'shortlisting'::public.job_request_status,
        'matched'::public.job_request_status
      )
    ),
    'active_employers', (
      select count(*) from public.employer_organizations
      where status = 'active'
    )
  );
end;
$$;

revoke all on function public.admin_dashboard_situation() from public;
grant execute on function public.admin_dashboard_situation() to service_role;

create or replace function public.admin_dashboard_urgency_count()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is not null then
    if not exists (select 1 from public.admin_users au where au.user_id = auth.uid()) then
      raise exception 'Non autorizzato';
    end if;
  end if;

  select
    coalesce((select count(*) from public.workers where status = 'pending_verification'::public.worker_status), 0)
    + coalesce((
      select count(*) from public.service_requests
      where status in (
        'submitted'::public.request_status,
        'diagnosing'::public.request_status,
        'inviting'::public.request_status
      )
    ), 0)
    + coalesce((
      select count(*) from public.job_requests
      where status = 'pending_review'::public.job_request_status
    ), 0)
    + coalesce((
      select count(*) from public.disputes
      where status in ('open'::public.dispute_status, 'under_review'::public.dispute_status)
    ), 0)
  into v_count;

  return v_count;
end;
$$;

revoke all on function public.admin_dashboard_urgency_count() from public;
grant execute on function public.admin_dashboard_urgency_count() to authenticated;
grant execute on function public.admin_dashboard_urgency_count() to service_role;

-- ---------------------------------------------------------------------------
-- Totali per skill (settore operativo)
-- ---------------------------------------------------------------------------

create or replace function public.admin_dashboard_by_sector()
returns table (
  skill_slug text,
  skill_label text,
  sos_enabled boolean,
  talent_count bigint,
  talent_active bigint,
  talent_pending bigint,
  talent_suspended bigint,
  annunci_total bigint,
  annunci_pending bigint,
  annunci_open bigint,
  annunci_matched bigint,
  sos_total bigint,
  sos_active bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    s.slug as skill_slug,
    s.label as skill_label,
    s.sos_enabled,
    coalesce(wc.total_count, 0) as talent_count,
    coalesce(wc.active_count, 0) as talent_active,
    coalesce(wc.pending_count, 0) as talent_pending,
    coalesce(wc.suspended_count, 0) as talent_suspended,
    coalesce(jc.total_count, 0) as annunci_total,
    coalesce(jc.pending_count, 0) as annunci_pending,
    coalesce(jc.open_count, 0) as annunci_open,
    coalesce(jc.matched_count, 0) as annunci_matched,
    coalesce(sc.total_count, 0) as sos_total,
    coalesce(sc.active_count, 0) as sos_active
  from public.skills s
  left join lateral (
    select
      count(distinct w.id) as total_count,
      count(distinct w.id) filter (where w.status = 'active'::public.worker_status) as active_count,
      count(distinct w.id) filter (where w.status = 'pending_verification'::public.worker_status) as pending_count,
      count(distinct w.id) filter (where w.status = 'suspended'::public.worker_status) as suspended_count
    from public.worker_skills ws
    inner join public.workers w on w.id = ws.worker_id
    where ws.skill_id = s.id
  ) wc on true
  left join lateral (
    select
      count(*) as total_count,
      count(*) filter (where jr.status = 'pending_review'::public.job_request_status) as pending_count,
      count(*) filter (where jr.status in (
        'open'::public.job_request_status,
        'shortlisting'::public.job_request_status
      )) as open_count,
      count(*) filter (where jr.status = 'matched'::public.job_request_status) as matched_count
    from public.job_requests jr
    where jr.skill_slug = s.slug
  ) jc on true
  left join lateral (
    select
      count(*) as total_count,
      count(*) filter (where sr.status in (
        'submitted'::public.request_status,
        'diagnosing'::public.request_status,
        'inviting'::public.request_status,
        'matched'::public.request_status
      )) as active_count
    from public.service_requests sr
    where sr.skill_id = s.id
  ) sc on true
  order by s.label;
end;
$$;

revoke all on function public.admin_dashboard_by_sector() from public;
grant execute on function public.admin_dashboard_by_sector() to service_role;

-- ---------------------------------------------------------------------------
-- Liste drill-down per skill
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_workers_for_skill(
  p_skill_slug text default null,
  p_status public.worker_status default null
)
returns table (
  worker_id uuid,
  user_id uuid,
  display_name text,
  status public.worker_status,
  talent_type public.talent_type,
  cap text,
  comune text,
  recruitment_active boolean,
  skill_slugs text[],
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    w.id as worker_id,
    w.user_id,
    p.display_name,
    w.status,
    w.talent_type,
    w.cap,
    w.comune,
    w.recruitment_active,
    coalesce(array_agg(distinct sk.slug) filter (where sk.slug is not null), '{}') as skill_slugs,
    w.created_at
  from public.workers w
  inner join public.profiles p on p.id = w.user_id
  left join public.worker_skills ws on ws.worker_id = w.id
  left join public.skills sk on sk.id = ws.skill_id
  where (p_skill_slug is null or exists (
    select 1 from public.worker_skills ws2
    inner join public.skills s2 on s2.id = ws2.skill_id
    where ws2.worker_id = w.id and s2.slug = p_skill_slug
  ))
  and (p_status is null or w.status = p_status)
  group by w.id, w.user_id, p.display_name, w.status, w.talent_type, w.cap, w.comune, w.recruitment_active, w.created_at
  order by w.created_at desc
  limit 200;
end;
$$;

revoke all on function public.admin_list_workers_for_skill(text, public.worker_status) from public;
grant execute on function public.admin_list_workers_for_skill(text, public.worker_status) to service_role;

create or replace function public.admin_list_jobs_for_skill(p_skill_slug text default null)
returns table (
  job_id uuid,
  role_title text,
  skill_slug text,
  cap text,
  comune text,
  status public.job_request_status,
  candidate_count bigint,
  employer_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    jr.id as job_id,
    jr.role_title,
    jr.skill_slug,
    jr.cap,
    jr.comune,
    jr.status,
    count(jc.id) as candidate_count,
    eo.name as employer_name,
    jr.created_at
  from public.job_requests jr
  inner join public.employer_organizations eo on eo.id = jr.employer_org_id
  left join public.job_candidates jc on jc.job_request_id = jr.id
  where (p_skill_slug is null or jr.skill_slug = p_skill_slug)
  group by jr.id, jr.role_title, jr.skill_slug, jr.cap, jr.comune, jr.status, eo.name, jr.created_at
  order by jr.created_at desc
  limit 200;
end;
$$;

revoke all on function public.admin_list_jobs_for_skill(text) from public;
grant execute on function public.admin_list_jobs_for_skill(text) to service_role;

create or replace function public.admin_list_sos_for_skill(p_skill_slug text default null)
returns table (
  request_id uuid,
  status public.request_status,
  urgency public.urgency_level,
  skill_label text,
  skill_slug text,
  pending_invites bigint,
  invitation_count bigint,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    sr.id as request_id,
    sr.status,
    sr.urgency,
    s.label as skill_label,
    s.slug as skill_slug,
    count(ri.id) filter (where ri.status = 'pending'::public.invitation_status) as pending_invites,
    count(ri.id) as invitation_count,
    sr.expires_at,
    sr.created_at
  from public.service_requests sr
  left join public.skills s on s.id = sr.skill_id
  left join public.request_invitations ri on ri.request_id = sr.id
  where sr.status in (
    'submitted'::public.request_status,
    'diagnosing'::public.request_status,
    'inviting'::public.request_status,
    'matched'::public.request_status
  )
  and (p_skill_slug is null or s.slug = p_skill_slug)
  group by sr.id, sr.status, sr.urgency, s.label, s.slug, sr.expires_at, sr.created_at
  order by sr.created_at desc
  limit 100;
end;
$$;

revoke all on function public.admin_list_sos_for_skill(text) from public;
grant execute on function public.admin_list_sos_for_skill(text) to service_role;

-- ---------------------------------------------------------------------------
-- Audit log visibile in UI
-- ---------------------------------------------------------------------------

create or replace function public.admin_get_audit_log(
  p_target_id uuid default null,
  p_limit integer default 10
)
returns table (
  id uuid,
  admin_email text,
  action text,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    l.id,
    l.admin_email,
    l.action,
    l.target_type,
    l.target_id,
    l.metadata,
    l.created_at
  from public.supermastro_admin_audit_log l
  where (p_target_id is null or l.target_id = p_target_id)
  order by l.created_at desc
  limit least(greatest(p_limit, 1), 50);
end;
$$;

revoke all on function public.admin_get_audit_log(uuid, integer) from public;
grant execute on function public.admin_get_audit_log(uuid, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Moderazione annunci e datori
-- ---------------------------------------------------------------------------

create or replace function public.admin_suspend_job_request(
  p_job_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.job_requests
  set
    status = 'suspended'::public.job_request_status,
    admin_note = coalesce(p_note, admin_note),
    updated_at = now()
  where id = p_job_id;
end;
$$;

revoke all on function public.admin_suspend_job_request(uuid, text) from public;
grant execute on function public.admin_suspend_job_request(uuid, text) to service_role;

create or replace function public.admin_close_job_request(
  p_job_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.job_requests
  set
    status = 'closed'::public.job_request_status,
    admin_note = coalesce(p_note, admin_note),
    updated_at = now()
  where id = p_job_id;
end;
$$;

revoke all on function public.admin_close_job_request(uuid, text) from public;
grant execute on function public.admin_close_job_request(uuid, text) to service_role;

create or replace function public.admin_set_employer_status(
  p_org_id uuid,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('active', 'suspended') then
    raise exception 'Stato non valido: %', p_status;
  end if;

  update public.employer_organizations
  set status = p_status, updated_at = now()
  where id = p_org_id;
end;
$$;

revoke all on function public.admin_set_employer_status(uuid, text, text) from public;
grant execute on function public.admin_set_employer_status(uuid, text, text) to service_role;

create or replace function public.admin_suspend_worker(
  p_worker_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_set_worker_status(p_worker_id, 'suspended'::public.worker_status, coalesce(p_note, 'suspended_by_admin'));
end;
$$;

revoke all on function public.admin_suspend_worker(uuid, text) from public;
grant execute on function public.admin_suspend_worker(uuid, text) to service_role;

create or replace function public.admin_reactivate_worker(
  p_worker_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_set_worker_status(p_worker_id, 'active'::public.worker_status, coalesce(p_note, 'reactivated_by_admin'));
end;
$$;

revoke all on function public.admin_reactivate_worker(uuid, text) from public;
grant execute on function public.admin_reactivate_worker(uuid, text) to service_role;
