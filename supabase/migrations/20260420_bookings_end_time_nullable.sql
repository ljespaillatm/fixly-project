-- Pending bookings have no real end until the contractor accepts (duration from preferences).
-- Allow NULL so the app can omit end_time for pending rows if you prefer.

alter table public.bookings
  alter column end_time drop not null;

notify pgrst, 'reload schema';
