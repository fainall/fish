# Aquaria — Issues Conocidos y Deuda Técnica

Última actualización: 2026-05-22

---

## CRÍTICOS (afectan experiencia de usuario en producción)

### 1. ChatScreen — IA completamente simulada
- **Archivo:** `src/screens/user/ChatScreen.tsx`
- **Problema:** Las respuestas de IA son locales con keyword-matching (`AI_RESPONSES`). No hay API de IA real. El delay de 1200ms simula una respuesta de servidor.
- **Impacto:** El usuario cree que está hablando con una IA real pero las respuestas son predefinidas.
- **Fix:** Integrar API de Claude/OpenAI o eliminar la feature hasta que haya backend real.

### 2. CommunityScreen — Usuario fantasma cuando no hay auth
- **Archivo:** `src/screens/user/CommunityScreen.tsx` (líneas 520-521)
- **Problema:** Si `user` es null, usa `userId='u1'` y `userName='Usuario Demo'` como fallback. Un usuario no autenticado podría crear posts bajo identidad falsa.
- **Impacto:** Posts fantasma en la comunidad.
- **Fix:** No permitir interacción si `!user`, mostrar prompt de login.

### 3. IS_DEMO_MODE sigue en el código
- **Archivos:** 16 de 18 hooks + 2 componentes + supabase.ts
- **Problema:** Toda la lógica de demo mode sigue activa. Si las env vars cambian o se pierden, la app silenciosamente cambia a modo demo sin que el usuario lo note.
- **Impacto:** En un escenario de producción, si `.env` se corrompe, todos los datos se guardan solo localmente.
- **Fix futuro:** Considerar remover IS_DEMO_MODE completamente o agregar un indicador visible cuando está activo.

---

## ALTOS (bugs que pueden causar pérdida de datos o comportamiento incorrecto)

### 4. Stale closure en múltiples hooks
- **Archivos:** useAquariums, useBreeding, useFishHistory, useWishlist, useParameterRecords, useTasks
- **Problema:** Los `useCallback` capturan el array de estado (`items`, `records`, `tasks`) del momento del render. Mutaciones rápidas consecutivas pueden sobreescribirse entre sí (la segunda usa estado viejo de la primera).
- **Impacto:** En uso normal es raro, pero tap rápido en "eliminar" + "agregar" podría perder datos.
- **Fix:** Usar `setX(prev => ...)` (functional updates) en vez de `setX(newValue)` en `persistLocal`.

### 5. useBreeding — Delete-then-reinsert no atómico
- **Archivo:** `src/hooks/useBreeding.tsx` (líneas 140-154)
- **Problema:** Al actualizar checklist/logs, primero borra todas las filas y luego reinserta. Si el insert falla después del delete, se pierden datos en el servidor.
- **Fix:** Usar transacción de Supabase o upsert en vez de delete+insert.

### 6. useAdminConversations — markRead es solo local
- **Archivo:** `src/hooks/useAdminConversations.ts` (línea 191)
- **Problema:** `markRead()` actualiza el estado local pero nunca persiste el estado de lectura a Supabase. La columna `unread_admin` en la DB nunca se actualiza.
- **Fix:** Agregar `supabase.from('conversations').update({ unread_admin: 0 }).eq('id', convId)`.

### 7. useFishSuggestions — Sin scope por usuario
- **Archivo:** `src/hooks/useFishSuggestions.tsx` (línea 28)
- **Problema:** `load()` hace `select('*')` sin filtro de `user_id`. Todos los usuarios ven todas las sugerencias. El AsyncStorage key también es global.
- **Impacto:** Sugerencias de un usuario son visibles para todos.
- **Fix:** Si es intencional para admin, documentar. Si no, agregar `.eq('user_id', uid)`.

---

## MEDIOS (mejoras de calidad y UX)

### 8. Pull-to-refresh falso en 3 pantallas
- **Archivos:** HomeScreen, ParametersScreen, TasksScreen
- **Problema:** El refresh es un `setTimeout` de 1-1.2 segundos sin refetch real de datos. El usuario cree que está actualizando pero no pasa nada.
- **Fix:** Llamar a las funciones de recarga de los hooks correspondientes.

### 9. useCommunity no es Context/Provider
- **Archivo:** `src/hooks/useCommunity.ts`
- **Problema:** Es un hook directo, no un Context provider. Cada componente que lo usa tiene estado independiente. Dos pantallas mostrando la comunidad tendrían datos diferentes.
- **Fix:** Convertir a Context provider como los demás hooks.

### 10. Comentarios nunca se refrescan
- **Archivo:** `src/hooks/useCommunity.ts` (línea 231)
- **Problema:** `loadComments` tiene guard `if (comments[postId]) return;` — una vez cargados, no se actualizan nunca hasta que se remonta el componente.
- **Fix:** Agregar opción de force-refresh o invalidar cache después de agregar comentario.

### 11. addComment sin rollback
- **Archivo:** `src/hooks/useCommunity.ts` (línea 254)
- **Problema:** `addComment` hace update optimista pero si falla Supabase, el comentario fantasma queda en el UI con ID temporal.
- **Fix:** Implementar rollback como en `toggleLike`.

### 12. useConversation — Mensajes AI no persisten
- **Archivo:** `src/hooks/useConversation.ts` (línea 116)
- **Problema:** `addAIMessage()` es local-only, no se guarda en Supabase. Las respuestas de IA se pierden al recargar.
- **Fix:** Insertar en tabla `messages` con `sender_role: 'ai'`.

### 13. useParameterRecords — Sin estado de loading
- **Archivo:** `src/hooks/useParameterRecords.tsx`
- **Problema:** `loading` nunca se pone en `true`. Los componentes pueden renderizar sin datos antes de que la carga termine.
- **Fix:** Inicializar `loading` en `true` y manejarlo en el useEffect de carga.

---

## BAJOS (deuda técnica y mejoras menores)

### 14. Versión hardcodeada en ProfileScreen
- **Archivo:** `src/screens/user/ProfileScreen.tsx`
- **Problema:** String `"v1.0.0"` hardcodeado. No se actualiza con nuevas versiones.
- **Fix:** Leer de `Constants.expoConfig.version` o `app.json`.

### 15. Aquarium3D — Three.js CDN hardcodeado
- **Archivos:** `Aquarium3D.web.tsx`, `Aquarium3D.native.tsx`
- **Problema:** URL del CDN (`cdnjs.cloudflare.com/.../r128/three.min.js`) hardcodeada. Si el CDN falla, la visualización se rompe. Versión r128 es antigua.
- **Duplicación:** ~280 líneas de `buildHTML()` duplicadas entre web y native.
- **Fix:** Extraer `buildHTML` a utilidad compartida. Considerar bundlear Three.js.

### 16. Aquarium3D.web — Sin fallback de error
- **Archivo:** `Aquarium3D.web.tsx`
- **Problema:** Si Three.js CDN falla, el iframe queda en blanco sin feedback. La versión native SÍ tiene fallback.
- **Fix:** Agregar `onError` handler al iframe.

### 17. console.warn sin gate en producción
- **Archivos:** ErrorBoundary.tsx (línea 21), UserProfileModal.tsx (línea 167), App.tsx (línea 67)
- **Problema:** `console.warn` ejecuta en builds de producción. Debería usar `captureError()` de Sentry.
- **Fix:** Reemplazar con `if (__DEV__) console.warn(...)` o usar Sentry.

### 18. ErrorBoundary — Tildes faltantes
- **Archivo:** `src/components/ErrorBoundary.tsx` (líneas 64, 66)
- **Problema:** "Algo salio mal" → "Algo salió mal", "Ocurrio" → "Ocurrió"
- **Fix:** Corregir strings.

### 19. AchievementToast — Memory leak en animación
- **Archivo:** `src/components/AchievementToast.tsx` (línea 71)
- **Problema:** `Animated.loop()` para glow pulse nunca se detiene después de dismiss.
- **Fix:** Guardar referencia al loop y llamar `.stop()` en dismiss.

### 20. FishImage — Color no usa theme
- **Archivo:** `src/components/FishImage.tsx` (línea 75)
- **Problema:** Fallback color `#0891b2` no coincide con `COLORS.primary` (#0090BF).
- **Fix:** Importar y usar `COLORS.primary`.

### 21. @react-navigation/drawer — Dependencia no usada
- **Archivo:** `package.json`
- **Problema:** Instalada pero nunca importada en el código.
- **Fix:** `npm uninstall @react-navigation/drawer`.

### 22. UserProfileModal — Detección de demo frágil
- **Archivo:** `src/components/community/UserProfileModal.tsx` (línea 109)
- **Problema:** Detecta usuarios demo con regex `/^u\d+$/`. Si un UUID real empieza con `u` + dígitos, se trataría como demo.
- **Fix:** Usar lista explícita de IDs demo o flag en el objeto de usuario.

### 23. Bubbles — Dimensions estático
- **Archivo:** `src/components/Bubbles.tsx` (línea 4)
- **Problema:** Usa `Dimensions.get('window')` a nivel de módulo. No se actualiza al rotar o en split-screen.
- **Fix:** Usar `useWindowDimensions()`.

### 24. Provider nesting depth
- **Archivo:** `App.tsx` (líneas 80-109)
- **Problema:** 12 niveles de providers anidados. Impacta rendimiento y legibilidad.
- **Fix:** Combinar providers relacionados o usar composición.

---

## Errores de TypeScript pre-existentes (no introducidos por nosotros)

| Archivo | Error | Causa |
|---------|-------|-------|
| `Aquarium3D.web.tsx` | CSS border type | iframe border prop |
| `useTasks.tsx` | NotificationBehavior | API change expo-notifications |
| `LoginScreen.tsx` / `RegisterScreen.tsx` | useProxy deprecated | expo-auth-session update |
| `OnboardingScreen.tsx` | key 'biotopico' | Falta en algún Record mapping |

---

## Pendientes por Versión

### v1.0 (lanzamiento)
- [ ] Fix #1 (ChatScreen) — Decidir: integrar IA real o quitar feature
- [ ] Fix #2 (CommunityScreen) — Bloquear usuario fantasma
- [ ] Fix #8 (Pull-to-refresh) — Hacer refresh real
- [ ] Fix #14 (Versión) — Leer de app.json
- [ ] Fix #18 (Tildes) — Corregir strings de ErrorBoundary
- [ ] Fix #21 (Drawer) — Eliminar dependencia no usada
- [ ] EAS Build para generar APK/IPA

### v1.1 (post-lanzamiento)
- [ ] Fix #4 (Stale closures) — Refactorizar todos los hooks
- [ ] Fix #5 (Breeding delete+insert) — Usar transacciones
- [ ] Fix #6 (markRead) — Persistir a Supabase
- [ ] Fix #9 (useCommunity) — Convertir a Context provider
- [ ] Fix #10, #11 (Comentarios) — Refresh + rollback
- [ ] Post edit/delete en Community
- [ ] Avatar upload a Supabase Storage (bucket `avatars`)
- [ ] ForgotPasswordScreen
- [ ] Quitar IS_DEMO_MODE o hacer visible

### v1.2 (mejora técnica)
- [ ] Fix #15 (Aquarium3D) — Extraer buildHTML compartido
- [ ] Fix #17 (console.warn) — Sentry en producción
- [ ] Fix #19 (Toast leak) — Stop animation loop
- [ ] Fix #24 (Providers) — Reducir nesting
- [ ] i18n para multi-idioma
