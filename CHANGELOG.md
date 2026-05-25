# Changelog — Aquaria (AquaManager)

Todas las mejoras, features y bugfixes documentados por versión.

---

## [1.0.0] — 2026-05-25 (OTA v9–v15)

### Panel de administrador — completitud y estadísticas (v15)
- **Indicador de completitud de ficha** — Cada especie en la lista del admin muestra un badge de % (verde ≥80, ámbar ≥50, rojo <50) según cuántos campos clave de la ficha están llenos, para detectar de un vistazo las fichas incompletas. Helper `fishCompleteness()`.
- **Badge "Oculto"** — Las especies no aprobadas se marcan en la lista (no aparecen en el catálogo público).
- **Dashboard ampliado** — El resumen ahora incluye Posts, Acuarios, Especies aprobadas, Ocultas y "Ficha media" (completitud promedio del catálogo), además de Usuarios y Conversaciones. Conteos de posts/acuarios traídos de Supabase con `count: 'exact'`.

### Panel de administrador — editor de especies completo (v14)
- **Editor de peces ampliado a la ficha completa (~40 campos)** — Antes solo se editaban ~15 campos. Ahora el editor cubre todas las secciones del modelo `Fish`: Identidad (subfamilia, hábitat, otros nombres), Físico (tamaño juvenil, vida, litros ideal), Parámetros avanzados (KH, TDS), Hábitat y preferencias (nivel de nado, dificultad, corriente, luz, sustrato, plantas, troncos, escondites, sal), Dieta y comportamiento (tipos de alimento, frecuencia, actividad, notas), Reproducción (método, dificultad, dimorfismo, notas), Compatibilidad (compatible/evitar), Salud (enfermedades), Conservación (IUCN, origen, CITES) y Variantes/morfos.
- **Control de publicación (admin)** — Nuevo toggle "Aprobado" para mostrar/ocultar una especie del catálogo público (`approved`).
- Implementado con helpers de render reutilizables (`txtField`, `arrField`, `toggleField`, `enumChips`, `numGrid`) llamados inline para no perder el foco de los inputs.

### Nuevas funciones (v13)
- **Eliminar comentario propio en la comunidad** — En el modal de comentarios, cada usuario ve un botón de papelera solo en SUS comentarios; al tocarlo pide confirmación y borra (optimista) actualizando el contador. Nueva función `deleteComment` en `useCommunity.ts` + política RLS `comments_delete` (`supabase/comment_delete_policy.sql`, también en `migration.sql`) que permite borrar únicamente el comentario propio (`auth.uid() = user_id`).

### Estabilidad de arranque (v9)
- **Fix "la app a veces no abre a la primera"** — Llamadas de red sin timeout en `useAuth` (`getSession`, `fetchProfile`) y `useUserProfile` colgaban la pantalla de splash para siempre en arranques con red lenta/fría. Añadido `withTimeout` (6s) con fallback a la caché local + red de seguridad (8s) que garantiza que la splash nunca se quede colgada. Nuevo util `src/utils/withTimeout.ts`. Sincronizaciones a Supabase movidas a segundo plano.

### Comunidad — perfiles de otros acuaristas (v11–v12)
- **Visor fullscreen de fotos en perfiles ajenos** — En `UserProfileModal`, las fotos de la galería de otros usuarios ahora son tocables y se abren en grande con su descripción (antes eran `<View>` sin acción).
- **Visibilidad pública de acuarios/peces/rutinas** — `supabase/community_visibility.sql`: políticas RLS de lectura pública (`SELECT TO authenticated`) para `aquariums`, `aquarium_fish` y `aquarium_tasks`. Escrituras siguen restringidas al dueño.
- **Fix sync de peces a Supabase (RESUELTO ✅)** — La tabla `aquarium_fish` estaba **vacía** en producción: los peces solo vivían en el almacenamiento local de cada teléfono, por eso nadie veía los peces de otros. Causa: `setFishQty` upsert fallaba silencioso + la carga sobrescribía la caché local con datos de Supabase sin peces. Fix en `useAquariums.tsx`: al cargar, si un acuario de Supabase no tiene peces pero el local sí, hace backfill (upsert) a `aquarium_fish` y conserva los locales. Cada usuario auto-cura sus peces al abrir la app.

### UI (v10)
- **Chips del selector de acuarios en Galería** — Se estiraban a toda la altura de la pantalla en nativo (el fix previo solo funcionaba en web). Solución a prueba de balas: contenedor de altura fija (44px) + altura explícita en los chips (36px) + etiqueta a una línea.

### Herramientas / Diagnóstico
- Diagnóstico de datos en vivo vía Chrome MCP → SQL Editor de Supabase (rol `postgres`, sin RLS). Nota: consultas con `anon key` dan vacío porque casi todas las políticas son `TO authenticated`.

---

## [1.0.0] — 2026-05-22 (OTA v8)

### Bug Fixes — Subida de fotos (RESUELTO ✅)
El crash de "pantalla en blanco" al subir fotos tenía **dos causas independientes** (código + backend), ambas resueltas:

**Causa A — Lectura del archivo local (crash nativo):**
Varios métodos para leer un `file://` URI crasheaban el runtime nativo (incatchable por try/catch JS). Descartados uno a uno:
  - `fetch(uri).blob()` / `fetch(uri).arrayBuffer()` — RN no lee URIs locales con fetch.
  - `atob()` sobre base64 grande — crashea Hermes por memoria.
  - `XMLHttpRequest` responseType arraybuffer — no lee URIs locales.
  - `FileSystem.uploadAsync` — crash nativo.
  - `expo-image-manipulator` — crash nativo.
  - `FileSystem.getInfoAsync` / `readAsStringAsync` (API legacy) — **lanzan "deprecated" en SDK 54**.
  - **SOLUCIÓN:** API `File` de expo-file-system SDK 54 → `new File(uri).bytes()` lee a `Uint8Array` nativamente y se sube directo con `supabase.storage.upload()`. Aplicado en `useAquariumGallery.tsx`, `useCommunity.ts`, `AdminDashboardScreen.tsx`.
  - `expo-file-system` agregado como dependencia directa en `package.json`.
  - `confirmUpload` aislado del ciclo de render con `setTimeout`.

**Causa B — Backend nunca configurado ("Bucket not found"):**
  - `supabase/migration.sql` usaba `CREATE POLICY IF NOT EXISTS` (sintaxis **inválida** en PostgreSQL). El error abortaba la transacción y revertía TODO → el bucket `posts` y la tabla `aquarium_photos` nunca se crearon.
  - **SOLUCIÓN:** nuevo `supabase/storage_setup.sql` idempotente que crea tabla + bucket + políticas. `migration.sql` corregido (`DROP POLICY IF EXISTS` + `CREATE`).
  - Política de INSERT corregida: valida solo `bucket_id` (el admin sube a `fish/`, no a `uid/`).

### Otros Bug Fixes
- **Upload silencioso ya no inserta URLs rotas** — Si el upload falla, `add()` lanza error visible en vez de guardar un `file://` roto en la BD.
- **Botón "Buscar actualizaciones" robusto** — `checkForUpdateAsync` fallido ya no muestra error técnico crudo; mensaje amable + opción de reiniciar, y guarda `__DEV__`.
- **Modo demo maneja galería correctamente** — En demo se salta el upload y guarda localmente.

### Documentation
- **ARCHITECTURE.md** — Documentación completa: estructura de archivos, navegación, tablas Supabase, design system, dependencias, tipos.
- **KNOWN_ISSUES.md** — 24 issues catalogados (3 críticos, 4 altos, 6 medios, 11 bajos) + roadmap por versión (v1.0, v1.1, v1.2).
- **CHANGELOG.md** — Historial retroactivo de todas las versiones desde v0.5.0.
- **Memoria del proyecto actualizada** — Estado de producción, issues críticos, pendientes priorizados.

---

## [0.9.0] — 2026-05-19

### Features
- **Sistema de nivel de acuarista** — 6 rangos basados en logros desbloqueados: Novato (0), Principiante (5), Intermedio (10), Avanzado (15), Experto (19), Maestro (todos). Se muestra en perfil y pantalla de logros.
- **22 logros expandidos** (antes 10) — Nuevos logros organizados por tier:
  - Bronze (5): first_parameter, first_fish, water_change_done, first_task, first_wishlist
  - Silver (8): first_breeding, schooling_complete, multi_aquarist, analyst, collector_5, task_streak_7, community_first, species_diverse
  - Gold (7): perfect_10, biotope_authentic, collector_10, analyst_50, breeder_3, green_thumb, tank_decorator
  - Platinum (2): dedicated_90, master
- **Volumen efectivo con desplazamiento** — Nuevo `getEffectiveVolume()` que calcula el volumen real restando sustrato, rocas, madera, plantas y equipamiento. Usado en 7 pantallas: AquariumScreen, HomeScreen, WishlistScreen, FloraScreen, CalculatorScreen.
- **Nivel de acuarista en perfil** — Reemplaza el selector manual de experiencia por badge automático basado en logros, con barra de progreso y milestone pills.
- **Skeleton loader** — Pantalla de carga con esqueletos animados en lugar de spinners.
- **Pull-to-refresh** — En las pantallas principales.
- **Barras de progreso en logros** — Visualización del avance hacia cada logro.
- **Edición de tareas** — Ahora se pueden editar tareas existentes del acuario.

### Bug Fixes
- **Fix logro de breeding** — Corregida la detección del logro de reproducción.
- **Eliminado Google Sign-In** — Removido por incompatibilidad; solo email/password.

---

## [0.8.0] — 2026-05-19

### Features
- **Sentry crash reporting** — Integración completa con identificación de usuario.
- **Política de privacidad** — Agregada URL de privacidad en app.json para las tiendas.
- **Calculadora de desplazamiento** — UI para calcular desplazamiento de sustrato, rocas, madera, plantas y equipo.

### Improvements
- **Production readiness** — ErrorBoundary en modo prod, corregidos 50+ catch vacíos, permisos de app, `.env.example`.
- **Ícono sin canal alfa** — Removido alpha channel de `icon.png` para cumplir con App Store.
- **Descripción de app** — Agregada en `app.json` para submission a tiendas.
- **Sentry DSN** — Corregido nombre de variable en `.env.example`.
- **expo-image-manipulator** — Removido de plugins (no tiene config plugin).

---

## [0.7.0] — 2026-05-16

### Features
- **Visor fullscreen de fotos de pez** — Tap en imagen de pez abre visor a pantalla completa.
- **Calculadora de bioload** — Stock calculator para medir carga biológica del acuario.
- **Quick actions mejoradas** — UI mejorada para acciones rápidas en pantalla principal.

### Bug Fixes
- **Fix crash expo-image-manipulator** — Lazy import para evitar error de módulo nativo faltante.
- **Fix congelamiento de galería** — Resuelto freeze al navegar fotos.

---

## [0.6.0] — 2026-05-15

### Features
- **Animaciones de scroll con Reanimated** — Animaciones fluidas en todas las pantallas principales usando Reanimated v4.

### Bug Fixes
- **Fix congelamiento de app** — Removido loop infinito de `Updates.reloadAsync()` al iniciar.

---

## [0.5.0] — 2026-05-11

### Branding
- **Rebrand a Aquaria** — Renombrado de AquaManager a Aquaria en toda la app.
- **Splash screen** — Color de fondo corregido a `#000516` para coincidir con logo de Aquaria.
- **Splash nativo removido** — Eliminada imagen splash nativa para evitar logo duplicado al iniciar.

---

## Archivos clave modificados por versión

| Versión | Archivos principales |
|---------|---------------------|
| Unreleased | `useAquariumGallery.tsx`, `useCommunity.ts`, `AdminDashboardScreen.tsx` |
| 0.9.0 | `useAchievements.tsx`, `AchievementsScreen.tsx`, `ProfileScreen.tsx`, `HomeScreen.tsx`, `stocking.ts`, `types/index.ts`, `AquariumScreen.tsx`, `WishlistScreen.tsx`, `FloraScreen.tsx`, `CalculatorScreen.tsx`, `CommunityScreen.tsx` |
| 0.8.0 | `app.json`, `App.tsx`, `ErrorBoundary.tsx`, `.env.example`, `icon.png` |
| 0.7.0 | `GalleryScreen.tsx`, `FishDetailModal.tsx`, `HomeScreen.tsx` |
| 0.6.0 | Todas las pantallas principales (Reanimated wrappers) |
| 0.5.0 | `app.json`, `package.json`, splash assets |
