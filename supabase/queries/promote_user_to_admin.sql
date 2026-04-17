-- Crear el primer administrador (no uses el registro público con rol admin).
-- 1) Registra un usuario normal en /#/register (cliente o contratista).
-- 2) En Supabase → SQL Editor, ejecuta (cambia el correo):

update public.profiles
set role = 'admin',
    onboarding_completed = true
where lower(email) = lower('tu-correo@ejemplo.com');
