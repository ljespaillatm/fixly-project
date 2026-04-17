-- Client generates / refreshes completion code in booking_verification_codes (upsert).
-- Contractor reads code to complete the booking. Enable policies if RLS is on.

alter table if exists public.booking_verification_codes enable row level security;

drop policy if exists "booking_verification_codes_select_client" on public.booking_verification_codes;
create policy "booking_verification_codes_select_client"
  on public.booking_verification_codes
  for select
  to authenticated
  using (client_id = auth.uid());

drop policy if exists "booking_verification_codes_select_contractor" on public.booking_verification_codes;
create policy "booking_verification_codes_select_contractor"
  on public.booking_verification_codes
  for select
  to authenticated
  using (contractor_id = auth.uid());

drop policy if exists "booking_verification_codes_insert_client" on public.booking_verification_codes;
create policy "booking_verification_codes_insert_client"
  on public.booking_verification_codes
  for insert
  to authenticated
  with check (
    client_id = auth.uid()
    and exists (
      select 1
      from public.bookings b
      where b.id = booking_id
        and b.user_id = auth.uid()
        and b.contractor_id = contractor_id
    )
  );

-- Contractor creates the row al iniciar servicio (correo / código inicial)
drop policy if exists "booking_verification_codes_insert_contractor" on public.booking_verification_codes;
create policy "booking_verification_codes_insert_contractor"
  on public.booking_verification_codes
  for insert
  to authenticated
  with check (
    contractor_id = auth.uid()
    and exists (
      select 1
      from public.bookings b
      where b.id = booking_id
        and b.contractor_id = auth.uid()
    )
  );

drop policy if exists "booking_verification_codes_update_client" on public.booking_verification_codes;
create policy "booking_verification_codes_update_client"
  on public.booking_verification_codes
  for update
  to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

drop policy if exists "booking_verification_codes_update_contractor" on public.booking_verification_codes;
create policy "booking_verification_codes_update_contractor"
  on public.booking_verification_codes
  for update
  to authenticated
  using (contractor_id = auth.uid())
  with check (contractor_id = auth.uid());

notify pgrst, 'reload schema';
