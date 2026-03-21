-- ============================================================
-- RPCs – Executar após rls_permissions.sql.
-- Funções: is_superadmin(), ensure_profile(). Grants para authenticated.
-- ============================================================

-- RPC: retornar se o usuário atual é superadmin (para esconder/mostrar página Configurações)
create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select is_superadmin from public.profiles where id = auth.uid()), false);
$$;

-- RPC: garantir que o usuário atual tenha um perfil (chamar após login)
create or replace function public.ensure_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  select
    auth.uid(),
    (select email from auth.users where id = auth.uid()),
    nullif(
      trim(
        coalesce(
          (select raw_user_meta_data->>'full_name' from auth.users where id = auth.uid()),
          (select raw_user_meta_data->>'name' from auth.users where id = auth.uid()),
          ''
        )
      ),
      ''
    )
  where auth.uid() is not null
  and not exists (select 1 from public.profiles where id = auth.uid());
end;
$$;

-- Impede que sessões com JWT (authenticated) alterem is_superadmin; promoção continua via SQL/painel
create or replace function public.profiles_preserve_superadmin()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.is_superadmin is distinct from old.is_superadmin
     and coalesce(auth.jwt()->>'role', '') = 'authenticated' then
    new.is_superadmin := old.is_superadmin;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_preserve_superadmin on public.profiles;
create trigger profiles_preserve_superadmin
  before update on public.profiles
  for each row
  execute function public.profiles_preserve_superadmin();

grant execute on function public.is_superadmin() to authenticated;
grant execute on function public.ensure_profile() to authenticated;
