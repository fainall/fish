-- ─────────────────────────────────────────────────────────────────────────────
-- ai_knowledge — "Entrenamiento" editable del Asistente de IA.
--
-- Cada fila es una corrección / hecho verificado por el admin. El Edge Function
-- `fish-ai` lee las filas ACTIVAS y las inyecta en el system prompt con PRIORIDAD
-- sobre el conocimiento general del modelo. No es fine-tuning: es "grounding"
-- (RAG-lite) — corriges algo y la IA responde bien al instante.
--
-- Ejecutar en: SQL Editor de Supabase (rol postgres).
-- Requiere la función public.is_admin() creada en security_fixes.sql.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.ai_knowledge (
  id         uuid primary key default gen_random_uuid(),
  topic      text not null,
  content    text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ai_knowledge is 'Correcciones/hechos verificados que el asistente fish-ai inyecta en su prompt (editable por admin).';

-- ── Auto-actualizar updated_at en cada UPDATE ────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_knowledge_touch on public.ai_knowledge;
create trigger ai_knowledge_touch
  before update on public.ai_knowledge
  for each row execute function public.touch_updated_at();

-- ── RLS: SOLO admins pueden leer/escribir desde la app ───────────────────────
-- El Edge Function las lee con service_role (que ignora RLS), así que los
-- usuarios normales no necesitan acceso directo a esta tabla.
alter table public.ai_knowledge enable row level security;

drop policy if exists ai_knowledge_admin_all on public.ai_knowledge;
create policy ai_knowledge_admin_all
  on public.ai_knowledge
  for all
  using (public.is_admin())
  with check (public.is_admin());
