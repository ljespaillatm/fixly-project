-- La app usa reviews.contractor_id, reviews.user_id, rating, comment (ver ServiceDetail, AdminContractors).

alter table if exists public.reviews
  add column if not exists contractor_id uuid references public.profiles(id) on delete cascade;

alter table if exists public.reviews
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

alter table if exists public.reviews
  add column if not exists rating integer;

alter table if exists public.reviews
  add column if not exists comment text;

alter table if exists public.reviews
  add column if not exists created_at timestamptz default now();

create index if not exists idx_reviews_contractor_id on public.reviews (contractor_id);
create index if not exists idx_reviews_user_id on public.reviews (user_id);

notify pgrst, 'reload schema';
