# Changelog — Aquaria (AquaManager)

Todas las mejoras, features y bugfixes documentados por versión.

---

## [1.0.0] — 2026-07-06 (OTA v29 · deadlock al guardar contraseña)

### Fix — "Guardar nueva contraseña" se quedaba cargando para siempre
- **Causa raíz:** el callback de `supabase.auth.onAuthStateChange` en `useAuth` era `async` y hacía `await fetchProfile()` (una llamada a Supabase) DENTRO del callback. Supabase advierte que esto puede causar **deadlock**: el callback corre con el "auth lock" tomado, así que `updateUser()` (guardar la contraseña) esperaba ese lock indefinidamente → spinner infinito.
- **Fix:** callback ahora síncrono; el trabajo async (fetchProfile/clear) se difiere con `setTimeout(0)` para liberar el lock de inmediato. Aplica a todo el auth (login, recuperación).
- **Red de seguridad:** `ResetPasswordScreen` envuelve `updateUser` en un `Promise.race` con timeout de 15s → si algo se atasca, muestra un aviso útil en vez de colgarse.

## [1.0.0] — 2026-06-10 (OTA v28 · eliminar cuenta)

### Eliminar cuenta dentro de la app (requisito de tiendas)
- **Nueva opción "Eliminar mi cuenta"** (Perfil → Cuenta) con **doble confirmación**. Borra la cuenta y TODOS los datos del usuario.
- Backend: nueva Edge Function `supabase/functions/delete-account` que verifica el JWT del llamante y usa el `service_role` (inyectado por Supabase) para `auth.admin.deleteUser`. El borrado de `auth.users` cascadea a todas las tablas ligadas (acuarios, peces, fotos, posts, tickets, etc.).
- App: `deleteAccount()` en `useAuth` invoca la función y limpia sesión/caché local; al terminar, AppNavigator vuelve al login.
- Permisos Android: removidos READ/WRITE_EXTERNAL_STORAGE y SCHEDULE_EXACT_ALARM (Play los cuestiona; no se necesitan).
- ⚠️ **Pendiente de desplegar** la Edge Function (`supabase functions deploy delete-account`). Hasta entonces, "Eliminar mi cuenta" mostrará un error. (El mismo deploy pendiente aplica a `fish-ai`.)

## [1.0.0] — 2026-06-10 (OTA v26 · auditoría, tanda 1)

### Fixes de la auditoría (tanda 1 — código verificado)
- **Tareas recurrentes se perdían** (`useTasks`): la siguiente ocurrencia se insertaba con un id local `task-…` en columna UUID → insert fallaba en silencio y desaparecía al recargar. Ahora se inserta sin ese id (Postgres genera el UUID).
- **Catálogo de peces congelado** (`FishCatalogScreen`): 3 `useMemo` (filteredFish, recommendedFish, originOptions) no tenían `ALL_FISH` en sus dependencias → se quedaban con datos locales viejos tras sincronizar con Supabase. Añadido a las deps.
- **Sobredosis de fertilizante** (`FloraScreen`): la calculadora "Por testeo" no normalizaba la coma decimal (teclado es-ES da "0,5") → `parseFloat("0,5")=0`. Ahora normaliza coma→punto antes de parsear.
- **Tarjeta "Tareas" del Home no navegaba**: el `TouchableOpacity` interno del StatPill capturaba el toque y el `onPress` externo nunca disparaba. StatPill ahora acepta `onPress` propio.
- **Iconos de logros en Comunidad se veían como texto** ("water", "fish"…): eran nombres de Ionicons renderizados dentro de `<Text>`. Cambiados a `<Ionicons>` en las 4 ubicaciones (banner de post + selector de logros).

### Seguridad — SQL preparado (pendiente de ejecutar)
- `supabase/security_fixes.sql`: cierra la **escalada a admin** (trigger que bloquea cambios de `role` desde el cliente) y la **fuga de emails** (lectura de `users` restringida a la propia fila + admin vía `is_admin()`). ⚠️ Correr en el SQL Editor.

### Notas
- Un hallazgo del revisor era falso positivo (MIME `image/png` ya estaba correcto); verificado antes de tocar.
- Pendientes de tanda 2 (requieren más verificación o son SQL): bug UUID de `useBreeding` (verificar esquema desplegado), rate-limit de la IA, decimales en editor admin, onboarding avanzado, pull-to-refresh falsos, posts/comentarios fantasma.

## [1.0.0] — 2026-06-10 (OTA v25)

### Fix — el campo de código solo aceptaba 6 dígitos, el correo envía 8 (v25)
- El largo del OTP es **configurable en Supabase** (este proyecto envía 8 dígitos) y el campo estaba fijado a 6 → no se podía terminar de escribir. Ahora acepta **6–10 dígitos** (maxLength 10, botón habilitado desde 6) y los textos dicen "código de verificación" sin asumir el largo.

## [1.0.0] — 2026-06-10 (OTA v24)

### Recuperación de contraseña por CÓDIGO de 6 dígitos (v24) — flujo definitivo
- **El correo ahora trae un código de 6 dígitos** (`{{ .Token }}`) que el usuario escribe EN la app: ForgotPassword muestra el campo de código tras enviar → `verifyOtp(type: 'recovery')` → al validar se abre "Nueva contraseña" (vía nuevo `recoveryBus` que activa el modo recuperación global de App.tsx).
- **Por qué:** el flujo por enlace resultó poco fiable en móvil — los enlaces de un solo uso los consumen los escáneres de Gmail antes del tap (el usuario llegaba a la app con su sesión normal y sin pantalla de cambio). El código no puede ser "gastado" por un escáner. El deep link se mantiene como atajo si llega vivo.
- **Plantilla de correo rediseñada** (dashboard): código grande y protagonista, asunto "🔑 Tu código para restablecer la contraseña - Aquaria", marca Aquaria + remitente soporte@severeynfish.cl.
- Nuevos: `src/services/recoveryBus.ts`; ForgotPasswordScreen con paso de verificación de código.

## [1.0.0] — 2026-06-10 (OTA v23)

### Cambiar contraseña dentro de la app + recuperación robusta (v23)
- **Nueva opción "Cambiar contraseña"** en Perfil → Cuenta (ruta `ChangePassword` en el ProfileStack, reutiliza `ResetPasswordScreen` con `updateUser`). Ya no depende del correo para cambiar la clave estando logueado.
- **Handler del deep link endurecido** (`App.tsx`): si el enlace del correo llega **expirado o ya consumido** (los escáneres de Gmail a veces "abren" los enlaces de un solo uso antes que el usuario), ahora muestra un aviso claro pidiendo solicitar uno nuevo — antes fallaba en silencio y la app abría normal, pareciendo que "no pasaba nada". Soporta además el formato PKCE (`?code=` → `exchangeCodeForSession`).
- Contexto: el deep link YA abría la app (esquema `aquaria://` confirmado en el build), pero la pantalla de nueva contraseña no aparecía — la causa más probable es el enlace consumido/expirado, ahora visible con el aviso.

## [1.0.0] — 2026-06-10 (config Supabase)

### Fix — Recuperación de contraseña no funcionaba (2 eslabones rotos)
- **Causa 1 — typo en el dominio del SMTP:** se configuró `mail.severynfish.cl` / `soporte@severynfish.cl` (falta una "e"; el dominio real es `severeynfish.cl`, como el apellido Severeyn). Ese host no existe en DNS → Supabase devolvía `500 Error sending recovery email` → **ningún correo salía**. Corregido en Auth → Emails → SMTP (sender, host y username); la contraseña guardada sobrevivió. Verificado con `POST /auth/v1/recover` → **HTTP 200** y correo real enviado desde "Aquaria <soporte@severeynfish.cl>".
- **Causa 2 — Redirect URL nunca agregado:** la lista de Redirect URLs estaba VACÍA, así que el `redirectTo: aquaria://reset-password` se ignoraba y el enlace del correo caía al Site URL (`http://localhost:3000` → página muerta). Agregado `aquaria://reset-password` a Redirect URLs.
- **Extra:** Site URL `http://localhost:3000` → `https://severeynfish.cl` (fallback de TODOS los correos de auth, incluida confirmación de registro).
- Diagnóstico: prueba de envío por REST (aisló el 500), `nslookup` de ambas variantes del dominio (descubrió el typo) y test de conexión SMTP a los puertos 465/587 (el servidor `s510.v2nets.com` funcionaba perfecto — el problema era solo el nombre).
- Nota: el deep link requiere que el build instalado tenga registrado el esquema `aquaria://` (se añadió en el commit del rebrand, el mismo día del último build — por confirmar al probar; si no abre, quedará resuelto con el próximo build nativo).

## [1.0.0] — 2026-06-08 (OTA v22)

### Adaptación a window insets — notch, Dynamic Island y barra de gestos (v22)
- **Antes nadie consumía los insets**: el `SafeAreaProvider` existía pero ninguna pantalla usaba `SafeAreaView`/`useSafeAreaInsets`; 18 pantallas dependían de un `paddingTop` fijo (~32px). En iPhones con notch/Dynamic Island (inset 47–59px) el header quedaba debajo del notch, y la tab bar no respetaba la barra de gestos.
- **Tab bar** (`AppNavigator`): altura y `paddingBottom` ahora suman `insets.bottom` (home indicator/gestos). En Android clásico (inset 0) queda idéntica.
- **19 pantallas envueltas** con `SafeAreaView edges={['top']}` de `react-native-safe-area-context` DENTRO del gradiente raíz (el fondo sigue cubriendo toda la pantalla, el contenido se desplaza según el inset real). `paddingTop: SPACING.xl` → `SPACING.sm` en los headers para no duplicar espacio. Onboarding, AdminDashboard y ForgotPassword usan `edges={['top','bottom']}` (no tienen tab bar). AchievementsScreen también envuelto (se monta como Modal fullscreen y no hereda el área segura del padre). FishCatalog/Flora NO se tocaron (van embebidos en Explore, que ya quedó protegido).
- **StatusBar** `style="light"` → `style="dark"`: la app es de tema claro; en iOS el texto del status bar habría sido invisible (blanco sobre claro).
- **`edgeToEdgeEnabled: true`** en app.json — aplica en el PRÓXIMO build nativo (Android 15+ lo fuerza igual; el código de insets ya lo soporta).

## [1.0.0] — 2026-05-31 (OTA v9–v21)

### Asistente IA real y seguro en el Chat (v21)
- **El chat ahora usa IA real (OpenAI)** en vez de respuestas locales por palabras clave. Arquitectura **segura**: la API key vive SOLO en una **Supabase Edge Function** (`supabase/functions/fish-ai`), nunca en la app (si estuviera en el bundle, cualquiera la extraería).
- **Candados de la IA** (system prompt blindado): responde SOLO sobre peces/acuarios; rechaza cualquier otro tema; nunca acciones de cuenta/clave/pagos; no revela instrucciones internas; ignora prompt-injection. Modelo `gpt-4o-mini`, máx 450 tokens (control de costo).
- App: `src/services/fishAI.ts` invoca la función con la sesión del usuario (sin key). `ChatScreen` usa la IA y **cae a las respuestas locales como respaldo** si la IA falla o no está desplegada (degradación elegante).
- `tsconfig.json`: excluye `supabase/functions` (código Deno) del type-check de la app.
- **Pendiente (tú):** rotar la API key expuesta, desplegar la función (`supabase functions deploy fish-ai`) y poner el secreto `OPENAI_API_KEY` en Supabase.

### Correo de marca propia — Custom SMTP (config Supabase, 2026-05-31)
- **Configurado Custom SMTP en Supabase** (Authentication → Emails → SMTP Settings) con el correo de cPanel del dominio `severynfish.cl`. Los correos de auth (recuperación, confirmación) ahora salen de **Aquaria `<soporte@severynfish.cl>`** en vez del remitente por defecto de Supabase (`noreply@mail.app.supabase.io`).
  - Sender: `soporte@severynfish.cl` · Nombre: "Aquaria" · Host: `mail.severynfish.cl` · Puerto: 465.
  - Esto además quita el límite de envío del correo integrado de Supabase (que "no es para producción").
- Nota: la plantilla del correo "Reset password" ya estaba personalizada con marca propia; lo que faltaba era el remitente (SMTP), ahora resuelto.

### Recuperar contraseña — flujo completo dentro de la app (v20)
- **Cambio de contraseña dentro de la app vía deep link.** El correo de recuperación ahora abre la app (`aquaria://reset-password`) en una pantalla **"Nueva contraseña"** (`ResetPasswordScreen`) donde el usuario fija la clave nueva (`supabase.auth.updateUser`).
- `ForgotPasswordScreen` envía con `redirectTo: 'aquaria://reset-password'`.
- `App.tsx`: handler de deep link (RN `Linking`, arranque en frío + app abierta) que parsea los tokens, establece la sesión de recuperación (`setSession`) y muestra `ResetPasswordScreen` en modo recuperación.
- **Config requerida en Supabase:** añadir `aquaria://reset-password` a Authentication → URL Configuration → **Redirect URLs**. El esquema `aquaria://` ya está en app.json (puede requerir build nativo nuevo para registrarse en el SO).

### Recuperar contraseña — base (v19)
- Implementada `ForgotPasswordScreen` (envío de correo) y registrada en AuthNavigator. Antes el botón era un cascarón (ruta inexistente).

## [1.0.0] — 2026-05-25 (OTA v9–v18)

### Analítica de uso — "zona caliente" (v18)
- **Rastreo de uso propio** (sin terceros, en Supabase). Nueva tabla `analytics_events` + RLS (`supabase/analytics_events.sql`): el usuario inserta solo sus eventos, el admin los ve todos. Servicio `src/services/analytics.ts` (fire-and-forget, no registra en demo ni `__DEV__`); el uid se setea desde `AuthProvider`.
- **Rastreo automático de pantallas** enganchado al `NavigationContainer` (`onStateChange` en `App.tsx`) → registra la pantalla activa en cada cambio, sin instrumentar pantalla por pantalla.
- **Pestaña "Métricas" en el panel admin**: resumen (vistas totales, usuarios activos), **zona caliente** (ranking de pantallas más visitadas con barras + %), y gráfico de vistas por día (últimos 7). Hook `useAdminAnalytics.ts` (agrega últimos 30 días en cliente).
- Nota de escala: `screen_view` genera muchas filas; para launch está bien, a futuro podar > 90 días o migrar a PostHog.

### Seguridad — eliminado "usuario fantasma" en Comunidad (v17)
- **Removido el fallback de identidad falsa** (`'u1'` / `'Usuario Demo'`) en `CommunityScreen`. Si por cualquier motivo no hubiera usuario, ya no se atribuye actividad a una identidad inventada; ahora usa cadena vacía y los handlers del hook (`toggleLike`/`addComment`/`createPost`) ya no-operan sin `uid`. (Comunidad vive tras el login, así que en producción siempre hay usuario real.) Cierra issue crítico #2.

### Tickets de soporte / reporte de errores (v16)
- **Pantalla "Reportar un error"** (Perfil → Más secciones) — el usuario elige tipo (Error/Sugerencia/Otro), describe el problema y adjunta una **captura de pantalla** opcional; abajo ve "Mis reportes" con su estado (Abierto/En proceso/Resuelto).
- **Pestaña "Tickets" en el panel admin** — lista todos los reportes con autor, descripción, captura y badge de abiertos; el admin cambia el estado con un toque.
- Nueva tabla `support_tickets` + RLS (`supabase/support_tickets.sql`): el usuario crea/ve los suyos, el admin ve todos y actualiza estado. Capturas al bucket `posts` bajo `tickets/`. Nuevo hook `useTickets.ts` y pantalla `SupportScreen.tsx`.

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
