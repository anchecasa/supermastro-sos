-- Procione — preferiti hotel/ristorante (solo prenotazioni confermate)

create table if not exists public.assistant_place_favorites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('restaurant', 'hotel')),
  name text not null,
  address text,
  city text not null,
  maps_url text,
  place_id text,
  rating numeric,
  notes text,
  booked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists assistant_place_favorites_owner_city_idx
  on public.assistant_place_favorites (owner_id, city, kind);

alter table public.assistant_place_favorites enable row level security;

create policy "assistant_place_favorites_admin_all"
  on public.assistant_place_favorites for all to authenticated
  using (owner_id = auth.uid() and public.is_procione_admin())
  with check (owner_id = auth.uid() and public.is_procione_admin());
