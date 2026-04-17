-- Pagos por reserva: total estimado (DOP), depósito 30%, saldo 70%, estado y sesiones Stripe Checkout.

alter table public.bookings
  add column if not exists payment_total_dop integer,
  add column if not exists payment_deposit_dop integer,
  add column if not exists payment_balance_dop integer,
  add column if not exists payment_status text,
  add column if not exists stripe_checkout_deposit_id text,
  add column if not exists stripe_checkout_balance_id text;

comment on column public.bookings.payment_status is
  'pending_deposit | deposit_paid | pending_balance | paid_full';

notify pgrst, 'reload schema';
