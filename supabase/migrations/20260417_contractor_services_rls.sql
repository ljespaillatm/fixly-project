-- Row Level Security for contractor_services and contractor_zones
-- Run this in Supabase SQL Editor if migrations are not applied automatically.

alter table if exists public.contractor_services enable row level security;
alter table if exists public.contractor_zones enable row level security;

-- contractor_services: anyone can read (marketplace / discovery with anon key + logged-in clients)
drop policy if exists "contractor_services_select_public" on public.contractor_services;
create policy "contractor_services_select_public"
  on public.contractor_services
  for select
  to anon, authenticated
  using (true);

-- contractor_services: contractors manage only their own rows
drop policy if exists "contractor_services_insert_own" on public.contractor_services;
create policy "contractor_services_insert_own"
  on public.contractor_services
  for insert
  to authenticated
  with check (contractor_id = auth.uid());

drop policy if exists "contractor_services_update_own" on public.contractor_services;
create policy "contractor_services_update_own"
  on public.contractor_services
  for update
  to authenticated
  using (contractor_id = auth.uid())
  with check (contractor_id = auth.uid());

drop policy if exists "contractor_services_delete_own" on public.contractor_services;
create policy "contractor_services_delete_own"
  on public.contractor_services
  for delete
  to authenticated
  using (contractor_id = auth.uid());

-- contractor_zones: same pattern
drop policy if exists "contractor_zones_select_public" on public.contractor_zones;
create policy "contractor_zones_select_public"
  on public.contractor_zones
  for select
  to anon, authenticated
  using (true);

drop policy if exists "contractor_zones_insert_own" on public.contractor_zones;
create policy "contractor_zones_insert_own"
  on public.contractor_zones
  for insert
  to authenticated
  with check (contractor_id = auth.uid());

drop policy if exists "contractor_zones_update_own" on public.contractor_zones;
create policy "contractor_zones_update_own"
  on public.contractor_zones
  for update
  to authenticated
  using (contractor_id = auth.uid())
  with check (contractor_id = auth.uid());

drop policy if exists "contractor_zones_delete_own" on public.contractor_zones;
create policy "contractor_zones_delete_own"
  on public.contractor_zones
  for delete
  to authenticated
  using (contractor_id = auth.uid());

notify pgrst, 'reload schema';
