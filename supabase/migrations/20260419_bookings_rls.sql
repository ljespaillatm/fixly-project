-- Bookings: clients must INSERT their own requests; both parties must SELECT; contractors UPDATE status.
-- Without these policies, RLS on public.bookings blocks inserts and you only see a generic app error.

alter table if exists public.bookings enable row level security;

drop policy if exists "bookings_insert_own_request" on public.bookings;
create policy "bookings_insert_own_request"
  on public.bookings
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and contractor_id is distinct from auth.uid()
  );

drop policy if exists "bookings_select_as_client" on public.bookings;
create policy "bookings_select_as_client"
  on public.bookings
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "bookings_select_as_contractor" on public.bookings;
create policy "bookings_select_as_contractor"
  on public.bookings
  for select
  to authenticated
  using (contractor_id = auth.uid());

drop policy if exists "bookings_update_as_contractor" on public.bookings;
create policy "bookings_update_as_contractor"
  on public.bookings
  for update
  to authenticated
  using (contractor_id = auth.uid())
  with check (contractor_id = auth.uid());

notify pgrst, 'reload schema';
