-- Perfil al crear usuario en Auth (necesario si "Confirm email" está activo: no hay sesión JWT en el cliente tras signUp).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
begin
  r := coalesce(nullif(trim(new.raw_user_meta_data->>'role'), ''), 'client');
  if r not in ('client', 'contractor', 'admin') then
    r := 'client';
  end if;

  if not exists (select 1 from public.profiles p where p.id = new.id) then
    insert into public.profiles (id, email, role, onboarding_completed)
    values (new.id, coalesce(new.email, ''), r, false);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
