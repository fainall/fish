# Aquaria — Arquitectura del Proyecto

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | React Native (Expo) | SDK 54, RN 0.81.5 |
| Lenguaje | TypeScript | 5.9.2 |
| Backend | Supabase | JS Client 2.103.3 |
| Navegación | React Navigation | 7.x (stack, tabs) |
| Animaciones | Reanimated | 4.1.1 |
| Crash Reporting | Sentry | 7.2.0 |
| Fuentes | DM Sans + DM Serif Display | Google Fonts |
| OTA Updates | EAS Update | Canal `preview` |

## Variables de Entorno (.env)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave pública anon de Supabase |
| `EXPO_PUBLIC_SENTRY_DSN` | No | DSN de Sentry para crash reporting |

**IS_DEMO_MODE** se activa automáticamente si `SUPABASE_URL` o `ANON_KEY` están vacías o contienen placeholders (`YOUR_`, `PEGA_`). En producción esto es `false`.

## Estructura de Archivos (src/)

```
src/
├── components/          # 9 archivos — Componentes reutilizables
│   ├── AchievementToast.tsx     # Toast animado al desbloquear logro
│   ├── Bubbles.tsx              # Burbujas decorativas animadas
│   ├── ErrorBoundary.tsx        # Error boundary con reporte a Sentry
│   ├── FishImage.tsx            # Imagen con fix para Wikipedia thumbnails
│   ├── SkeletonLoader.tsx       # Skeleton loaders (Home, Params, Tasks)
│   ├── aquarium/
│   │   ├── Aquarium3D.d.ts      # Types para componente 3D
│   │   ├── Aquarium3D.native.tsx # 3D con WebView + Three.js (móvil)
│   │   └── Aquarium3D.web.tsx   # 3D con iframe + Three.js (web)
│   └── community/
│       └── UserProfileModal.tsx # Modal de perfil público
│
├── constants/           # 2 archivos
│   ├── theme.ts         # Design system "Sunlit Reef" (colores, tipografía, spacing)
│   └── tips.ts          # Tips educativos por nivel (beginner/intermediate/advanced)
│
├── data/                # 6 archivos — Datos estáticos
│   ├── fishDatabase.ts       # Catálogo local de peces (~57 especies)
│   ├── plantDatabase.ts      # Catálogo de plantas
│   ├── communityData.ts      # Datos demo de comunidad
│   ├── aquariumStyles.ts     # Estilos de acuario (10 tipos)
│   ├── breedingData.ts       # Datos de reproducción
│   └── fishExpertData.ts     # Datos expertos adicionales por especie
│
├── hooks/               # 18 archivos — Lógica de negocio + Supabase
│   ├── useAuth.tsx              # Autenticación (Supabase Auth)
│   ├── useUserProfile.tsx       # Perfil de usuario (tabla user_profiles)
│   ├── useAquariums.tsx         # CRUD acuarios + peces (aquariums, aquarium_fish)
│   ├── useParameterRecords.tsx  # Registros de parámetros (parameter_records)
│   ├── useTasks.tsx             # Tareas con recurrencia (aquarium_tasks)
│   ├── useBreeding.tsx          # Reproducción (breeding_goals, checklist, logs)
│   ├── useFishDatabase.tsx      # Catálogo de peces (tabla fish)
│   ├── useFishHistory.tsx       # Historial de peces (fish_history)
│   ├── useFishSuggestions.tsx   # Sugerencias de peces (fish_suggestions)
│   ├── useWishlist.tsx          # Lista de deseos (wishlist)
│   ├── useAchievements.tsx      # 22 logros + 6 niveles (user_achievements)
│   ├── useAquariumGallery.tsx   # Galería de fotos (aquarium_photos + Storage)
│   ├── useCommunity.ts          # Red social (posts, likes, comments + Storage)
│   ├── useConversation.ts       # Chat usuario (conversations, messages + Realtime)
│   ├── useAdminConversations.ts # Chat admin (conversations, messages + Realtime)
│   ├── useFertReminders.ts      # Recordatorios fertilizante (fert_reminders)
│   ├── useFishImagePrefetch.ts  # Precarga de imágenes (solo local, sin Supabase)
│   └── useResponsive.ts         # Utilidad responsive (sin Supabase)
│
├── navigation/          # 1 archivo
│   └── AppNavigator.tsx # Navegación completa (auth → onboarding → tabs/admin)
│
├── screens/             # 22 archivos
│   ├── SplashScreen.tsx         # Splash animado
│   ├── auth/
│   │   ├── LoginScreen.tsx      # Login (email/password)
│   │   └── RegisterScreen.tsx   # Registro
│   ├── onboarding/
│   │   └── OnboardingScreen.tsx # Onboarding de 6 pasos
│   ├── user/
│   │   ├── HomeScreen.tsx           # Dashboard principal
│   │   ├── AquariumScreen.tsx       # Gestión de acuario (1661 líneas)
│   │   ├── ExploreScreen.tsx        # Contenedor catálogo + flora
│   │   ├── ProfileScreen.tsx        # Perfil + ajustes
│   │   ├── ParametersScreen.tsx     # Registro de parámetros
│   │   ├── HealthScreen.tsx         # Diagnóstico de enfermedades
│   │   ├── CalculatorScreen.tsx     # Calculadoras (agua, sal, condicionador)
│   │   ├── BreedingScreen.tsx       # Gestión de reproducción
│   │   ├── TasksScreen.tsx          # Tareas y recordatorios
│   │   ├── WishlistScreen.tsx       # Lista de deseos con compatibilidad
│   │   ├── GalleryScreen.tsx        # Galería de fotos del acuario
│   │   ├── CommunityScreen.tsx      # Red social (1165 líneas)
│   │   ├── ChatScreen.tsx           # Chat con IA simulada (LOCAL)
│   │   ├── FishCatalogScreen.tsx    # Catálogo de peces con filtros
│   │   ├── FloraScreen.tsx          # Plantas + fertilización (1799 líneas)
│   │   ├── AchievementsScreen.tsx   # Pantalla de logros y niveles
│   │   └── LegalScreen.tsx          # Política de privacidad + ToS
│   └── admin/
│       └── AdminDashboardScreen.tsx # Panel de administración
│
├── services/            # 2 archivos
│   ├── supabase.ts      # Cliente Supabase (real o mock según IS_DEMO_MODE)
│   └── sentry.ts        # Integración Sentry
│
├── types/               # 1 archivo
│   └── index.ts         # Todas las interfaces y types del dominio
│
└── utils/               # 5 archivos
    ├── compatibility.ts # Compatibilidad entre peces (score 0-100)
    ├── fishAlerts.ts    # Alertas contextuales (parámetros, schooling, salud)
    ├── stocking.ts      # Calculadora de bioload + volumen efectivo
    ├── confirm.ts       # Diálogo de confirmación cross-platform
    └── animations.tsx   # Hooks de animación con Reanimated
```

## Navegación

```
Root
├── SplashScreen (2.5s mínimo)
├── AuthNavigator (si no hay usuario)
│   ├── Login
│   └── Register
├── OnboardingScreen (si no completó onboarding)
├── AdminDashboard (si rol = admin)
└── UserTabs (usuario normal)
    ├── Tab "Inicio" → HomeScreen → [Tasks]
    ├── Tab "Acuario" → AquariumScreen → [Parameters, Health, Calculator, Breeding]
    ├── Tab "Explorar" → ExploreScreen (FishCatalog + Flora) → [Wishlist]
    └── Tab "Perfil" → ProfileScreen → [Gallery, Community, Chat, Legal, Achievements]
```

**Nota:** FishCatalogScreen, FloraScreen y AchievementsScreen se acceden por navegación interna (no están en las tabs directamente).

## Supabase — Tablas y Storage

### Tablas (con RLS habilitado)
| Tabla | Hook principal | Descripción |
|-------|---------------|-------------|
| `user_profiles` | useUserProfile | Perfil + onboarding + preferencias |
| `aquariums` | useAquariums | Acuarios del usuario |
| `aquarium_fish` | useAquariums | Peces en cada acuario (join) |
| `aquarium_photos` | useAquariumGallery | Fotos de galería |
| `aquarium_tasks` | useTasks | Tareas con recurrencia |
| `parameter_records` | useParameterRecords | Registros de parámetros de agua |
| `fish` | useFishDatabase | Catálogo de peces (admin puede editar) |
| `fish_history` | useFishHistory | Historial de altas/bajas de peces |
| `fish_suggestions` | useFishSuggestions | Sugerencias de peces por usuarios |
| `breeding_goals` | useBreeding | Metas de reproducción |
| `breeding_checklist` | useBreeding | Checklist de condiciones |
| `breeding_logs` | useBreeding | Registro de eventos de cría |
| `wishlist` | useWishlist | Lista de deseos de peces |
| `user_achievements` | useAchievements | Logros desbloqueados |
| `fert_reminders` | useFertReminders | Recordatorios de fertilizante |
| `posts` | useCommunity | Posts de comunidad |
| `post_likes` | useCommunity | Likes (optimistic) |
| `post_comments` | useCommunity | Comentarios |
| `posts_with_counts` | useCommunity | Vista con conteos de likes/comments |
| `conversations` | useConversation | Conversaciones de chat |
| `messages` | useConversation | Mensajes de chat (Realtime) |

### Storage
| Bucket | Uso | Archivos que lo usan |
|--------|-----|---------------------|
| `posts` | Fotos de galería + imágenes de posts + fotos admin | useAquariumGallery, useCommunity, AdminDashboardScreen |

### Patrón de upload (producción)
```typescript
const response = await fetch(localUri);
const arrayBuffer = await response.arrayBuffer();
await supabase.storage.from('posts').upload(path, arrayBuffer, { contentType, upsert: false });
const { data } = supabase.storage.from('posts').getPublicUrl(path);
```

## Sistema de Logros y Niveles

### 22 Logros (4 tiers)
| Tier | Logros | Color |
|------|--------|-------|
| Bronze | first_parameter, first_fish, water_change_done, first_task, first_wishlist | #CD7F32 |
| Silver | first_breeding, schooling_complete, multi_aquarist, analyst, collector_5, task_streak_7, community_first, species_diverse | #C0C0C0 |
| Gold | perfect_10, biotope_authentic, collector_10, analyst_50, breeder_3, green_thumb, tank_decorator | #FFD700 |
| Platinum | dedicated_90, master | #B0E0E6 |

### 6 Niveles de Acuarista
| Nivel | Logros requeridos | Icono |
|-------|-------------------|-------|
| Novato | 0 | 🐟 |
| Principiante | 5 | 🐠 |
| Intermedio | 10 | 🐡 |
| Avanzado | 15 | 🦈 |
| Experto | 19 | 🐋 |
| Maestro | Todos (22) | 🔱 |

## Volumen Efectivo

`getEffectiveVolume(volumeLiters, displacement)` en `src/utils/stocking.ts`

| Factor | Litros desplazados por unidad |
|--------|-------------------------------|
| Sustrato (kg) | 0.6 L/kg |
| Rocas (kg) | 0.38 L/kg |
| Madera (kg) | 0.8 L/kg |
| Plantas (kg) | 0.5 L/kg |
| Equipo (litros) | 1.0 L/L |

Piso mínimo: 30% del volumen original. Default sin datos: 15% desplazamiento estimado.

## Design System "Sunlit Reef"

- **Colores primarios:** `#0090BF` (primary), `#006E99` (dark), `#33B8D4` (light)
- **Fondo:** `#F2F8FC` (background), `#FFFFFF` (cards)
- **Texto:** `#0C1E2D` (primary), `#2E6680` (secondary), `#6A9AB8` (muted)
- **Semánticos:** `#009870` (success), `#C87D00` (warning), `#D94040` (error), `#7052C8` (accent)
- **Tipografía:** DM Sans (400-800) para UI, DM Serif Display para títulos
- **Spacing:** Base 8px — xs(8), sm(12), md(16), lg(24), xl(32), xxl(48)
- **Border radius:** sm(8), md(16), lg(20), xl(24), xxl(28), full(9999)

## Dependencias Principales

### Runtime (30 packages)
- `react` 19.1.0, `react-native` 0.81.5, `expo` ~54.0.34
- `@supabase/supabase-js` ^2.103.3
- `@react-navigation/native` ^7.2.2 + stack + bottom-tabs
- `react-native-reanimated` ~4.1.1
- `@sentry/react-native` ~7.2.0
- `expo-image` ~3.0.11, `expo-image-picker` ~17.0.11, `expo-image-manipulator` ~14.0.8
- `expo-notifications` ~0.32.17, `expo-updates` ~29.0.17
- `react-native-chart-kit` ^6.12.0, `react-native-svg` 15.12.1
- `date-fns` ^4.1.0

### No usadas (candidatas a eliminar)
- `@react-navigation/drawer` — importada en package.json pero nunca usada en código
