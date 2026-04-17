-- Run in Supabase SQL Editor. Adjust email fragments if needed.

-- 1) Contractor: zones + services on disk (replace plomerote fragment)
select
  p.id as contractor_user_id,
  p.email,
  p.role,
  coalesce(
    (select string_agg(cz.zone, ', ' order by cz.zone) from public.contractor_zones cz where cz.contractor_id = p.id),
    '(sin filas en contractor_zones)'
  ) as zones_in_db,
  (select count(*)::int from public.contractor_services cs where cs.contractor_id = p.id) as services_in_db
from public.profiles p
where p.email ilike '%plomerote89%'
   or p.email ilike '%plomerote%';

-- 2) Client Tuto: saved sector (replace tuto fragment)
select
  p.id as client_user_id,
  p.email,
  p.zone as client_zone_in_profiles
from public.profiles p
where p.email ilike '%tuto%';

-- 3) For a given service UUID: who is linked and in which zones?
-- Paste the same UUID as in the app URL after /service/
select
  cs.contractor_id,
  pr.email as contractor_email,
  cs.service_id,
  (select string_agg(cz.zone, ', ') from public.contractor_zones cz where cz.contractor_id = cs.contractor_id) as contractor_zones
from public.contractor_services cs
join public.profiles pr on pr.id = cs.contractor_id
where cs.service_id = '10137de4-5424-4b7e-8844-ead5e62bfcfa'::uuid;
