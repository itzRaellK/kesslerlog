# KesslerLog

Aplicação web para acompanhar jogos, sessões com cronômetro, ciclos e reviews. Multiusuário com Supabase (auth + banco).

## Stack

- **Next.js 15** (App Router), React 18, TypeScript
- **Tailwind CSS** – tema light/dark (dark real)
- **Supabase** – auth, Postgres, RLS
- **TanStack Query**, Recharts, Radix UI

## Estrutura

- `app/` – páginas (home, jogos, sessoes, stats, configuracoes, login)
- `components/` – Layout (topbar), UI (shadcn-style), drawers, páginas
- `database/` – scripts Supabase:
  - `schema.sql` – tabelas (genre_types, status_types, review_badge_types, games, game_external_scores, cycles, sessions, reviews, waitlist, profiles)
  - `views.sql` – views (games_with_details, cycles_with_details, monthly_*)
  - `rls_permissions.sql` – RLS e políticas
  - `rpcs.sql` – funções (is_superadmin, ensure_profile)
  - `seed.sql` – dados iniciais (gêneros, status, badges)

## Setup

1. **Clone e instale**
   ```bash
   npm install
   ```

2. **Supabase**
   - Crie um projeto em [supabase.com](https://supabase.com).
   - No SQL Editor, execute na ordem: `schema.sql` → `views.sql` → `rls_permissions.sql` → `rpcs.sql` → `seed.sql`.

3. **Variáveis de ambiente**
   - Copie `.env.local.example` para `.env.local`.
   - Preencha:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **Usuário e superadmin (opcional)**
   - Crie o usuário no Supabase (**Authentication → Users** ou convite) e faça login em `/login`.
   - Para superadmin, no SQL Editor:
     ```sql
     insert into public.profiles (id, email, is_superadmin)
     values ('SEU_USER_UID', 'seu@email.com', true)
     on conflict (id) do update set is_superadmin = true;
     ```
   - A página **Configurações** (tipos de gênero, status, badges) fica restrita a superadmin pelas políticas RLS.

## Rodar

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Sem `.env.local` válido, o app abre mas as chamadas ao Supabase falham; com env configurado, use login com um usuário criado no Supabase.

## Bordas e tema

- Bordas padronizadas em `rounded-md` (nada de `rounded-full` em cards/containers).
- Dark mode real (background `0 0% 0%`), sem gray/blue-gray.

## Base de referência

O layout e o design seguem o projeto em `base/` (app Lovable/Vite), adaptados para Next.js + Supabase.
