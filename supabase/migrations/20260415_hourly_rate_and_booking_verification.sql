-- Add hourly pricing per contractor service
alter table public.contractor_services
  add column if not exists hourly_rate numeric(10,2);

update public.contractor_services
set hourly_rate = 1
where hourly_rate is null;

alter table public.contractor_services
  alter column hourly_rate set not null;

alter table public.contractor_services
  drop constraint if exists contractor_services_hourly_rate_check;

alter table public.contractor_services
  add constraint contractor_services_hourly_rate_check check (hourly_rate > 0);

-- Extend booking lifecycle statuses and timestamps
alter table public.bookings
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table public.bookings
  drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending', 'accepted', 'in_progress', 'completed', 'rejected'));

-- Verification code storage for service completion
create table if not exists public.booking_verification_codes (
  id bigint generated always as identity primary key,
  booking_id bigint not null references public.bookings(id) on delete cascade,
  contractor_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  email_sent_at timestamptz not null default now(),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (booking_id)
);

create index if not exists idx_booking_verification_codes_contractor_id
  on public.booking_verification_codes (contractor_id);

create index if not exists idx_booking_verification_codes_client_id
  on public.booking_verification_codes (client_id);
