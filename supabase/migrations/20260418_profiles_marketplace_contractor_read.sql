-- Marketplace embeds `profiles` on `contractor_id`. With typical RLS ("only my row"),
-- clients cannot read other users' profiles and the join returns zero contractors.
-- Allow reading profiles that actually appear as contractors in `contractor_services`.

drop policy if exists "profiles_select_contractors_marketplace" on public.profiles;
create policy "profiles_select_contractors_marketplace"
  on public.profiles
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.contractor_services cs
      where cs.contractor_id = profiles.id
    )
  );

notify pgrst, 'reload schema';
