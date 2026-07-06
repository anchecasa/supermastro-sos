-- Procione: allowlist email admin (Fernando + AncheCasa)

create table if not exists public.admin_email_allowlist (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.admin_email_allowlist enable row level security;

create policy "admin_email_allowlist_select_admin"
  on public.admin_email_allowlist for select to authenticated
  using (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
    or exists (
      select 1
      from public.admin_email_allowlist ae
      join auth.users u on lower(u.email) = lower(ae.email)
      where u.id = auth.uid()
    )
  );

insert into public.admin_email_allowlist (email) values
  ('palumbofernando12@gmail.com'),
  ('anchecasa@anchecasa.it'),
  ('amministrazione@anchecasa.it')
on conflict (email) do nothing;

create or replace function public.is_procione_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users au where au.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.admin_email_allowlist ae
    join auth.users u on lower(u.email) = lower(ae.email)
    where u.id = auth.uid()
  );
$$;
