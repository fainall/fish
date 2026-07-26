-- ─────────────────────────────────────────────────────────────────────────────
-- UGC Safety: bloqueo de usuarios + reportes de contenido
--
-- Requisito de Google Play para apps con contenido generado por usuarios
-- (comunidad, comentarios, fotos). Sin esto la app puede recibir clasificacion
-- 17+ o ser rechazada en la revision.
--
-- Ejecutar en: SQL Editor de Supabase (rol postgres).
-- Requiere la funcion public.is_admin() creada en security_fixes.sql.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── user_blocks ───────────────────────────────────────────────────────────────
-- El "blocker" oculta al "blocked" en su feed, comentarios y perfiles.
create table if not exists public.user_blocks (
  id          uuid primary key default gen_random_uuid(),
  blocker_id  uuid not null references auth.users(id) on delete cascade,
  blocked_id  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocker_idx on public.user_blocks(blocker_id);

alter table public.user_blocks enable row level security;

-- El usuario solo ve y modifica sus propios bloqueos
drop policy if exists user_blocks_self on public.user_blocks;
create policy user_blocks_self
  on public.user_blocks
  for all
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);

-- ── support_tickets: extender para reportes de contenido ─────────────────────
-- Reusamos support_tickets con categoria 'report' + target_type/target_id.
-- Asi el panel admin ya los ve (misma tabla, misma RLS).
alter table public.support_tickets
  add column if not exists target_type text,
  add column if not exists target_id   text,
  add column if not exists target_user_id uuid references auth.users(id) on delete set null;

comment on column public.support_tickets.target_type is 'post | comment | user | null (ticket normal)';
comment on column public.support_tickets.target_id   is 'id del post/comentario/usuario reportado';
comment on column public.support_tickets.target_user_id is 'autor del contenido reportado';
