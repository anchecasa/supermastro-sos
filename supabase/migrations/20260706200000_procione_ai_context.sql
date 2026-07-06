-- Procione AI — snapshot operativo per conversazione Fernando (admin)

create or replace function public.procione_ops_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_procione_admin() then
    raise exception 'Non autorizzato';
  end if;

  return jsonb_build_object(
    'sos_active', (
      select count(*)::int from public.service_requests
      where status in (
        'submitted'::public.request_status,
        'diagnosing'::public.request_status,
        'inviting'::public.request_status
      )
    ),
    'sos_idraulico_active', (
      select count(*)::int
      from public.service_requests sr
      inner join public.skills s on s.id = sr.skill_id
      where s.slug = 'idraulico'
        and sr.status in (
          'submitted'::public.request_status,
          'diagnosing'::public.request_status,
          'inviting'::public.request_status
        )
    ),
    'sos_today', (
      select count(*)::int from public.service_requests
      where created_at >= date_trunc('day', now() at time zone 'Europe/Rome')
    ),
    'pending_verification', (
      select count(*)::int from public.workers
      where status = 'pending_verification'::public.worker_status
    ),
    'open_disputes', (
      select count(*)::int from public.disputes
      where status in ('open'::public.dispute_status, 'under_review'::public.dispute_status)
    )
  );
end;
$$;

revoke all on function public.procione_ops_snapshot() from public;
grant execute on function public.procione_ops_snapshot() to authenticated;

alter type public.assistant_action_type add value if not exists 'navigate';
alter type public.assistant_action_type add value if not exists 'chat';
alter type public.assistant_action_type add value if not exists 'draft';
