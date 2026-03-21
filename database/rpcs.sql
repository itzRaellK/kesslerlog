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
  insert into public.profiles (id, email)
  select auth.uid(), (select email from auth.users where id = auth.uid())
  where auth.uid() is not null
  and not exists (select 1 from public.profiles where id = auth.uid());
end;
$$;

grant execute on function public.is_superadmin() to authenticated;
grant execute on function public.ensure_profile() to authenticated;
