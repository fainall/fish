-- ============================================================
-- AquaManager — Supabase Schema
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- EXTENSIONES
-- ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";


-- ══════════════════════════════════════════════════════════════
-- 1. USERS  (extiende auth.users de Supabase)
-- ══════════════════════════════════════════════════════════════
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text not null,
  avatar_url  text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now()
);

-- Trigger: crea la fila en public.users automáticamente al registrar en auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    'user'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ══════════════════════════════════════════════════════════════
-- 2. USER_PROFILES  (onboarding + preferencias)
-- ══════════════════════════════════════════════════════════════
create table public.user_profiles (
  id                    uuid primary key references public.users(id) on delete cascade,
  experience            text not null default 'beginner'
                          check (experience in ('beginner','intermediate','advanced','expert')),
  knows_cycling         boolean,
  has_aquarium          boolean not null default false,
  goals                 text[]  not null default '{}',
  water_types           text[]  not null default '{freshwater}',
  onboarding_completed  boolean not null default false,
  completed_at          timestamptz,
  display_name          text,
  -- Acuario del onboarding (snapshot inicial, no reemplaza la tabla aquariums)
  onboard_volume_liters int,
  onboard_water_type    text,
  onboard_style         text,
  onboard_length_cm     int,
  onboard_width_cm      int,
  onboard_height_cm     int,
  updated_at            timestamptz not null default now()
);

-- Trigger: crea perfil vacío cuando se crea el usuario
create or replace function public.handle_new_profile()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_user_created_profile
  after insert on public.users
  for each row execute procedure public.handle_new_profile();


-- ══════════════════════════════════════════════════════════════
-- 3. FISH  (catálogo de peces — gestionado por admin)
-- ══════════════════════════════════════════════════════════════
create table public.fish (
  id              uuid primary key default uuid_generate_v4(),
  common_name     text not null,
  scientific_name text not null,
  family          text not null default '',
  origin          text not null default '',
  adult_size_cm   numeric(5,1) not null default 0,
  temp_min        numeric(4,1) not null default 20,
  temp_max        numeric(4,1) not null default 28,
  ph_min          numeric(4,2) not null default 6.0,
  ph_max          numeric(4,2) not null default 7.8,
  gh_min          int          not null default 3,
  gh_max          int          not null default 15,
  water_level     text not null default 'middle'
                    check (water_level in ('top','middle','bottom','all')),
  aggression      int  not null default 2 check (aggression between 1 and 5),
  min_tank_liters int  not null default 40,
  diet            text not null default '',
  description     text not null default '',
  image_url       text,
  is_schooling    boolean not null default false,
  schooling_min   int,
  water_type      text not null default 'freshwater'
                    check (water_type in ('freshwater','saltwater','brackish')),
  tags            text[] not null default '{}',
  approved        boolean not null default false,
  created_by      uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index idx_fish_water_type on public.fish(water_type);
create index idx_fish_approved   on public.fish(approved);


-- ══════════════════════════════════════════════════════════════
-- 4. COMPATIBILITY_RULES  (reglas explícitas entre peces)
-- ══════════════════════════════════════════════════════════════
create table public.compatibility_rules (
  id        uuid primary key default uuid_generate_v4(),
  fish_a_id uuid not null references public.fish(id) on delete cascade,
  fish_b_id uuid not null references public.fish(id) on delete cascade,
  result    text not null check (result in ('compatible','caution','incompatible')),
  reason    text not null default '',
  -- Evitar duplicados en ambas direcciones
  constraint compat_unique unique (
    least(fish_a_id::text, fish_b_id::text),
    greatest(fish_a_id::text, fish_b_id::text)
  )
);


-- ══════════════════════════════════════════════════════════════
-- 5. AQUARIUMS  (acuarios del usuario)
-- ══════════════════════════════════════════════════════════════
create table public.aquariums (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.users(id) on delete cascade,
  name           text not null,
  volume_liters  int  not null default 100,
  length_cm      int,
  width_cm       int,
  height_cm      int,
  water_type     text not null default 'freshwater'
                   check (water_type in ('freshwater','saltwater','brackish')),
  aquarium_style text
                   check (aquarium_style in (
                     'amazonico','tropical','agua_fria','plantado','africano',
                     'comunitario','biotopico','marino','arrecife','salobre'
                   )),
  description    text,
  image_url      text,
  created_at     timestamptz not null default now()
);

create index idx_aquariums_user on public.aquariums(user_id);


-- ══════════════════════════════════════════════════════════════
-- 6. AQUARIUM_FISH  (peces dentro de cada acuario)
-- ══════════════════════════════════════════════════════════════
create table public.aquarium_fish (
  id           uuid primary key default uuid_generate_v4(),
  aquarium_id  uuid not null references public.aquariums(id) on delete cascade,
  -- fish_id es text para compatibilidad con IDs locales del catálogo embebido.
  -- Migrar a uuid references public.fish(id) cuando el catálogo viva en Supabase.
  fish_id      text not null,
  quantity     int  not null default 1 check (quantity > 0),
  added_at     timestamptz not null default now(),
  constraint aquarium_fish_unique unique (aquarium_id, fish_id)
);

create index idx_aqfish_aquarium on public.aquarium_fish(aquarium_id);


-- ══════════════════════════════════════════════════════════════
-- 7. PARAMETER_RECORDS  (historial de parámetros de agua)
-- ══════════════════════════════════════════════════════════════
create table public.parameter_records (
  id           uuid primary key default uuid_generate_v4(),
  aquarium_id  uuid not null references public.aquariums(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  date         timestamptz not null default now(),
  temperature  numeric(5,2),
  ph           numeric(5,3),
  ammonia      numeric(6,3),
  nitrite      numeric(6,3),
  nitrate      numeric(6,2),
  gh           numeric(5,1),
  kh           numeric(5,1),
  salinity     numeric(5,2),
  notes        text,
  created_at   timestamptz not null default now()
);

create index idx_params_aquarium on public.parameter_records(aquarium_id);
create index idx_params_date     on public.parameter_records(date desc);


-- ══════════════════════════════════════════════════════════════
-- 8. AQUARIUM_TASKS  (calendario de tareas)
-- ══════════════════════════════════════════════════════════════
create table public.aquarium_tasks (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.users(id) on delete cascade,
  aquarium_id     uuid not null references public.aquariums(id) on delete cascade,
  type            text not null
                    check (type in (
                      'water_change','feeding','filter_clean',
                      'fertilizer','medication','parameter_check','custom'
                    )),
  title           text not null,
  description     text,
  due_date        timestamptz not null,
  recurrence      text not null default 'none'
                    check (recurrence in ('none','daily','weekly','biweekly','monthly')),
  completed       boolean not null default false,
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_tasks_user      on public.aquarium_tasks(user_id);
create index idx_tasks_aquarium  on public.aquarium_tasks(aquarium_id);
create index idx_tasks_due       on public.aquarium_tasks(due_date);
create index idx_tasks_completed on public.aquarium_tasks(completed);


-- ══════════════════════════════════════════════════════════════
-- 9. BREEDING_GOALS  (objetivos de reproducción)
-- ══════════════════════════════════════════════════════════════
create table public.breeding_goals (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  fish_id     text not null,  -- text por compatibilidad con IDs locales
  aquarium_id uuid references public.aquariums(id) on delete set null,
  status      text not null default 'planning'
                check (status in ('planning','active','success','failed')),
  started_at  timestamptz not null default now(),
  notes       text not null default '',
  last_temp   numeric(4,1),
  last_ph     numeric(4,2),
  last_gh     numeric(4,1),
  created_at  timestamptz not null default now()
);

create index idx_breeding_user on public.breeding_goals(user_id);


-- ══════════════════════════════════════════════════════════════
-- 10. BREEDING_CHECKLIST  (checklist por objetivo)
-- ══════════════════════════════════════════════════════════════
create table public.breeding_checklist (
  id                uuid primary key default uuid_generate_v4(),
  breeding_goal_id  uuid not null references public.breeding_goals(id) on delete cascade,
  label             text not null,
  description       text not null default '',
  category          text not null
                      check (category in ('water','tank','feeding','behavior','care')),
  completed         boolean not null default false,
  completed_at      timestamptz
);

create index idx_checklist_goal on public.breeding_checklist(breeding_goal_id);


-- ══════════════════════════════════════════════════════════════
-- 11. BREEDING_LOGS  (diario por objetivo)
-- ══════════════════════════════════════════════════════════════
create table public.breeding_logs (
  id                uuid primary key default uuid_generate_v4(),
  breeding_goal_id  uuid not null references public.breeding_goals(id) on delete cascade,
  type              text not null
                      check (type in ('water_change','feeding','parameter','behavior','note')),
  label             text not null,
  value             text,
  timestamp         timestamptz not null default now()
);

create index idx_logs_goal on public.breeding_logs(breeding_goal_id);


-- ══════════════════════════════════════════════════════════════
-- 12. FISH_SUGGESTIONS  (sugerencias de usuarios)
-- ══════════════════════════════════════════════════════════════
create table public.fish_suggestions (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.users(id) on delete cascade,
  user_name        text not null,
  status           text not null default 'pending'
                     check (status in ('pending','approved','rejected')),
  created_at       timestamptz not null default now(),
  reviewed_at      timestamptz,
  reject_reason    text,
  -- Datos del pez sugerido
  common_name      text not null,
  scientific_name  text not null,
  family           text,
  origin           text,
  temp_min         numeric(4,1),
  temp_max         numeric(4,1),
  ph_min           numeric(4,2),
  ph_max           numeric(4,2),
  gh_min           int,
  gh_max           int,
  adult_size_cm    numeric(5,1),
  min_tank_liters  int,
  water_type       text check (water_type in ('freshwater','saltwater','brackish')),
  description      text,
  image_url        text,
  notes            text
);

create index idx_suggestions_status on public.fish_suggestions(status);
create index idx_suggestions_user   on public.fish_suggestions(user_id);


-- ══════════════════════════════════════════════════════════════
-- 13. POSTS  (comunidad)
-- ══════════════════════════════════════════════════════════════
create table public.posts (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  content    text not null,
  image_url  text,
  tags       text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_posts_user    on public.posts(user_id);
create index idx_posts_created on public.posts(created_at desc);

-- Likes: tabla relacional (mejor que array)
create table public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);


-- ══════════════════════════════════════════════════════════════
-- 14. POST_COMMENTS  (comentarios)
-- ══════════════════════════════════════════════════════════════
create table public.post_comments (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

create index idx_comments_post on public.post_comments(post_id);


-- ══════════════════════════════════════════════════════════════
-- 15. CONVERSATIONS  (chat usuario ↔ admin)
-- ══════════════════════════════════════════════════════════════
create table public.conversations (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.users(id) on delete cascade,
  status          text not null default 'open' check (status in ('open','closed')),
  last_message    text,
  last_message_at timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_conversations_user   on public.conversations(user_id);
create index idx_conversations_status on public.conversations(status);


-- ══════════════════════════════════════════════════════════════
-- 16. MESSAGES  (mensajes del chat)
-- ══════════════════════════════════════════════════════════════
create table public.messages (
  id               uuid primary key default uuid_generate_v4(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  sender_id        uuid not null references public.users(id) on delete cascade,
  sender_role      text not null check (sender_role in ('user','admin','ai')),
  content          text not null,
  image_url        text,
  created_at       timestamptz not null default now()
);

create index idx_messages_conversation on public.messages(conversation_id);
create index idx_messages_created      on public.messages(created_at);

-- Trigger: actualiza last_message en conversations
create or replace function public.update_conversation_last_message()
returns trigger language plpgsql security definer as $$
begin
  update public.conversations
  set
    last_message    = new.content,
    last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger on_message_inserted
  after insert on public.messages
  for each row execute procedure public.update_conversation_last_message();


-- ══════════════════════════════════════════════════════════════
-- 17. USER_ACHIEVEMENTS  (logros desbloqueados)
-- ══════════════════════════════════════════════════════════════
create table public.user_achievements (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.users(id) on delete cascade,
  achievement_id text not null
                   check (achievement_id in (
                     'first_parameter','first_fish','water_change_done',
                     'first_breeding','perfect_10','schooling_complete',
                     'biotope_authentic','multi_aquarist','analyst','master'
                   )),
  unlocked_at    timestamptz not null default now(),
  constraint user_achievement_unique unique (user_id, achievement_id)
);

create index idx_achievements_user on public.user_achievements(user_id);


-- ══════════════════════════════════════════════════════════════
-- 18. FERT_REMINDERS  (recordatorios de fertilización)
-- ══════════════════════════════════════════════════════════════
create table public.fert_reminders (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  day_index  int  not null check (day_index between 0 and 3),
  day_label  text not null,
  weekday    int  not null check (weekday between 1 and 7),
  hour       int  not null check (hour between 0 and 23),
  minute     int  not null check (minute in (0,15,30,45)),
  enabled    boolean not null default false,
  notif_ids  text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint fert_reminder_unique unique (user_id, day_index)
);

create index idx_fert_user on public.fert_reminders(user_id);


-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ══════════════════════════════════════════════════════════════

-- Habilitar RLS en todas las tablas
alter table public.users             enable row level security;
alter table public.user_profiles     enable row level security;
alter table public.fish              enable row level security;
alter table public.compatibility_rules enable row level security;
alter table public.aquariums         enable row level security;
alter table public.aquarium_fish     enable row level security;
alter table public.parameter_records enable row level security;
alter table public.aquarium_tasks    enable row level security;
alter table public.breeding_goals    enable row level security;
alter table public.breeding_checklist enable row level security;
alter table public.breeding_logs     enable row level security;
alter table public.fish_suggestions  enable row level security;
alter table public.posts             enable row level security;
alter table public.post_likes        enable row level security;
alter table public.post_comments     enable row level security;
alter table public.conversations     enable row level security;
alter table public.messages          enable row level security;
alter table public.user_achievements enable row level security;
alter table public.fert_reminders    enable row level security;

-- ── users ──────────────────────────────────────────────────────
create policy "users: ver todos"       on public.users for select using (true);
create policy "users: editar propio"   on public.users for update using (auth.uid() = id);

-- ── user_profiles ──────────────────────────────────────────────
create policy "profiles: ver propio"   on public.user_profiles for select using (auth.uid() = id);
create policy "profiles: editar propio" on public.user_profiles for all   using (auth.uid() = id);

-- ── fish (catálogo público lectura; admin escribe) ─────────────
create policy "fish: lectura pública"  on public.fish for select using (approved = true);
create policy "fish: admin todo"       on public.fish for all
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

-- ── compatibility_rules ────────────────────────────────────────
create policy "compat: lectura pública" on public.compatibility_rules for select using (true);
create policy "compat: admin escribe"   on public.compatibility_rules for all
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

-- ── aquariums ──────────────────────────────────────────────────
create policy "aquariums: propio"      on public.aquariums for all using (auth.uid() = user_id);

-- ── aquarium_fish ──────────────────────────────────────────────
create policy "aqfish: propio"         on public.aquarium_fish for all
  using (exists (select 1 from public.aquariums a where a.id = aquarium_id and a.user_id = auth.uid()));

-- ── parameter_records ──────────────────────────────────────────
create policy "params: propio"         on public.parameter_records for all using (auth.uid() = user_id);

-- ── aquarium_tasks ─────────────────────────────────────────────
create policy "tasks: propio"          on public.aquarium_tasks for all using (auth.uid() = user_id);

-- ── breeding_goals ─────────────────────────────────────────────
create policy "breeding: propio"       on public.breeding_goals for all using (auth.uid() = user_id);

-- ── breeding_checklist ─────────────────────────────────────────
create policy "checklist: propio"      on public.breeding_checklist for all
  using (exists (select 1 from public.breeding_goals g where g.id = breeding_goal_id and g.user_id = auth.uid()));

-- ── breeding_logs ──────────────────────────────────────────────
create policy "logs: propio"           on public.breeding_logs for all
  using (exists (select 1 from public.breeding_goals g where g.id = breeding_goal_id and g.user_id = auth.uid()));

-- ── fish_suggestions ───────────────────────────────────────────
create policy "suggestions: ver propio + admin" on public.fish_suggestions for select
  using (auth.uid() = user_id or
         exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
create policy "suggestions: crear"     on public.fish_suggestions for insert with check (auth.uid() = user_id);
create policy "suggestions: admin edita" on public.fish_suggestions for update
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

-- ── posts (comunidad pública) ──────────────────────────────────
create policy "posts: lectura pública" on public.posts for select using (true);
create policy "posts: crear propio"    on public.posts for insert with check (auth.uid() = user_id);
create policy "posts: editar propio"   on public.posts for update using (auth.uid() = user_id);
create policy "posts: borrar propio"   on public.posts for delete using (auth.uid() = user_id);

-- ── post_likes ─────────────────────────────────────────────────
create policy "likes: lectura pública" on public.post_likes for select using (true);
create policy "likes: propio"          on public.post_likes for all   using (auth.uid() = user_id);

-- ── post_comments ──────────────────────────────────────────────
create policy "comments: lectura pública" on public.post_comments for select using (true);
create policy "comments: crear propio"    on public.post_comments for insert with check (auth.uid() = user_id);
create policy "comments: borrar propio"   on public.post_comments for delete using (auth.uid() = user_id);

-- ── conversations ──────────────────────────────────────────────
create policy "conv: propio + admin"   on public.conversations for select
  using (auth.uid() = user_id or
         exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
create policy "conv: crear propio"     on public.conversations for insert with check (auth.uid() = user_id);
create policy "conv: admin actualiza"  on public.conversations for update
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

-- ── messages ───────────────────────────────────────────────────
create policy "msg: ver conv propia + admin" on public.messages for select
  using (
    exists (select 1 from public.conversations c
            where c.id = conversation_id
            and (c.user_id = auth.uid() or
                 exists (select 1 from public.users where id = auth.uid() and role = 'admin')))
  );
create policy "msg: insertar si en conv"  on public.messages for insert
  with check (
    exists (select 1 from public.conversations c
            where c.id = conversation_id
            and (c.user_id = auth.uid() or
                 exists (select 1 from public.users where id = auth.uid() and role = 'admin')))
  );

-- ── user_achievements ──────────────────────────────────────────
create policy "ach: ver todos"         on public.user_achievements for select using (true);
create policy "ach: propio"            on public.user_achievements for insert with check (auth.uid() = user_id);

-- ── fert_reminders ─────────────────────────────────────────────
create policy "fert: propio"           on public.fert_reminders for all using (auth.uid() = user_id);


-- ══════════════════════════════════════════════════════════════
-- VISTA ÚTIL: posts con conteo de likes y comentarios
-- ══════════════════════════════════════════════════════════════
create or replace view public.posts_with_counts as
select
  p.*,
  u.full_name  as user_name,
  u.avatar_url as user_avatar,
  count(distinct pl.user_id)::int as likes_count,
  count(distinct pc.id)::int      as comments_count,
  array_agg(distinct pl.user_id) filter (where pl.user_id is not null) as likes
from public.posts p
join public.users u on u.id = p.user_id
left join public.post_likes    pl on pl.post_id = p.id
left join public.post_comments pc on pc.post_id = p.id
group by p.id, u.full_name, u.avatar_url;


-- ══════════════════════════════════════════════════════════════
-- REALTIME  (habilitar para chat en vivo)
-- ══════════════════════════════════════════════════════════════
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
