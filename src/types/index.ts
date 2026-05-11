// Auth
export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'user' | 'admin';
  created_at: string;
}

// Fish
export type WaterType = 'freshwater' | 'saltwater' | 'brackish';
export type AquariumStyle =
  | 'amazonico'
  | 'tropical'
  | 'agua_fria'
  | 'plantado'
  | 'africano'
  | 'comunitario'
  | 'biotopico'
  | 'marino'
  | 'arrecife'
  | 'salobre';
export type AggressionLevel = 1 | 2 | 3 | 4 | 5;
export type WaterLevel = 'top' | 'middle' | 'bottom' | 'all';
export type CompatibilityResult = 'compatible' | 'caution' | 'incompatible';

export type DifficultyLevel  = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type BreedingMethod   = 'egg-scatter' | 'cave-spawner' | 'mouthbrooder' | 'livebearer' | 'bubble-nest' | 'plant-spawner' | 'substrate-spawner' | 'unknown';
export type ConservationStatus = 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX' | 'DD' | 'NE';
export type FlowPreference   = 'still' | 'gentle' | 'moderate' | 'strong';
export type LightPreference  = 'dim' | 'moderate' | 'bright';
export type SubstratePref    = 'sand' | 'fine-gravel' | 'gravel' | 'bare-bottom' | 'any';

export interface Fish {
  id: string;
  // ── Identity ────────────────────────────────────────────────
  common_name: string;
  scientific_name: string;
  /** Other names this species is sold under */
  alt_names?: string[];
  family: string;
  /** Subfamily / tribe (optional) */
  subfamily?: string;
  origin: string;
  /** Specific habitat type (e.g. "Slow rivers, flooded forests") */
  habitat?: string;

  // ── Physical ────────────────────────────────────────────────
  adult_size_cm: number;
  /** Size at which the fish is typically sold */
  juvenile_size_cm?: number;
  /** Average lifespan in years */
  lifespan_years?: number;

  // ── Water parameters ────────────────────────────────────────
  temp_min: number;
  temp_max: number;
  ph_min: number;
  ph_max: number;
  gh_min: number;
  gh_max: number;
  /** Carbonate hardness range (KH) */
  kh_min?: number;
  kh_max?: number;
  /** Total dissolved solids range in ppm (advanced/RO setups) */
  tds_min?: number;
  tds_max?: number;

  // ── Tank / Habitat preferences ──────────────────────────────
  water_level: WaterLevel;
  aggression: AggressionLevel;
  min_tank_liters: number;
  /** Recommended ideal tank size for thriving (vs. min) */
  ideal_tank_liters?: number;
  flow_preference?: FlowPreference;
  light_preference?: LightPreference;
  substrate_preference?: SubstratePref;
  /** Plants compatible? Or do they uproot/eat them */
  plant_compatible?: boolean;
  /** Needs driftwood (e.g. plecos to digest) */
  needs_driftwood?: boolean;
  /** Needs hiding spots / caves */
  needs_hiding?: boolean;
  /** Tolerates salt addition (brackish-friendly) */
  salt_tolerant?: boolean;

  // ── Diet ────────────────────────────────────────────────────
  diet: string;
  /** Recommended foods, more specific */
  food_types?: string[];
  /** Times to feed per day */
  feeding_frequency?: string;

  // ── Behavior ────────────────────────────────────────────────
  description: string;
  is_schooling: boolean;
  schooling_min?: number;
  /** Notable behaviors (jumper, digger, fin-nipper, etc.) */
  behavior_notes?: string[];
  /** Active during day / night / crepuscular */
  activity?: 'diurnal' | 'nocturnal' | 'crepuscular';

  // ── Sexual dimorphism / breeding ────────────────────────────
  /** How to differentiate male/female */
  sexual_dimorphism?: string;
  /** Breeding method */
  breeding_method?: BreedingMethod;
  /** Breeding-specific water parameters and conditions */
  breeding_notes?: string;
  /** Difficulty rating to breed (1=easy, 5=expert) */
  breeding_difficulty?: 1 | 2 | 3 | 4 | 5;

  // ── Compatibility ───────────────────────────────────────────
  /** Names of typical compatible tankmates */
  compatible_with?: string[];
  /** Species to AVOID */
  avoid_with?: string[];

  // ── Health ──────────────────────────────────────────────────
  /** Common diseases this species is prone to */
  common_diseases?: string[];
  /** General difficulty to keep */
  difficulty?: DifficultyLevel;

  // ── Conservation & sourcing ─────────────────────────────────
  conservation_status?: ConservationStatus;
  /** Whether usually wild-caught, captive-bred, or both */
  sourcing?: 'wild' | 'captive' | 'both';
  /** CITES listing if any */
  cites?: 'I' | 'II' | 'III' | null;

  // ── Variants / morphs ───────────────────────────────────────
  /** Color variants or selectively bred morphs (e.g. Halfmoon, Plakat for Betta) */
  variants?: string[];

  image_url?: string;
  /** Additional images */
  image_urls?: string[];

  water_type: WaterType;
  tags: string[];
  approved: boolean;
  created_by: string;
}

// Compatibility
export interface CompatibilityCheck {
  fish_a:      Fish;
  fish_b:      Fish;
  result:      CompatibilityResult;
  reasons:     string[];
  /** 0-100: qué tan bien se solapan los rangos de parámetros */
  paramScore:  number;
  /** Detalle por parámetro */
  params: {
    temp:  'ok' | 'narrow' | 'fail';
    ph:    'ok' | 'narrow' | 'fail';
    gh:    'ok' | 'narrow' | 'fail';
    water: 'ok' | 'fail';
    size:  'ok' | 'caution' | 'fail';
    aggr:  'ok' | 'caution' | 'fail';
  };
}

export interface CompatibilityRule {
  id: string;
  fish_a_id: string;
  fish_b_id: string;
  result: CompatibilityResult;
  reason: string;
}

// Aquarium
export interface Aquarium {
  id: string;
  user_id: string;
  name: string;
  volume_liters: number;
  water_type: WaterType;
  description?: string;
  image_url?: string;
  created_at: string;
}

export interface AquariumFish {
  id: string;
  aquarium_id: string;
  fish_id: string;
  quantity: number;
  fish?: Fish;
}

// Water Parameters
export interface WaterParameter {
  id: string;
  aquarium_id: string;
  recorded_at: string;
  temperature?: number;
  ph?: number;
  ammonia?: number;
  nitrite?: number;
  nitrate?: number;
  gh?: number;
  kh?: number;
  salinity?: number;
  notes?: string;
}

export interface ParameterAlert {
  parameter: string;
  value: number;
  ideal_min: number;
  ideal_max: number;
  affected_fish: string[];
}

// Breeding
export type BreedingStatus = 'planning' | 'active' | 'success' | 'failed';

export interface BreedingGoal {
  id: string;
  user_id: string;
  aquarium_id?: string;
  fish_id: string;
  fish?: Fish;
  status: BreedingStatus;
  started_at: string;
  notes?: string;
  checklist?: BreedingChecklistItem[];
}

export interface BreedingChecklistItem {
  id: string;
  breeding_goal_id: string;
  label: string;
  description: string;
  completed: boolean;
  category: 'water' | 'tank' | 'feeding' | 'behavior' | 'care';

}

// Community / Social
export interface Post {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  image_url?: string;
  tags: string[];
  likes: string[];
  comments_count: number;
  created_at: string;
  /** Optional achievement badge attached to the post (community sharing). */
  achievement_id?: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

// Multi-aquarium
export interface AquariumFishEntry {
  fishId: string;
  qty: number;
}

export interface AquariumEntry {
  id: string;
  name: string;
  volume_liters: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  water_type: WaterType;
  aquarium_style?: AquariumStyle;
  description?: string;
  fish: AquariumFishEntry[];
  created_at: string;
}

// Parameter records (persistent, per aquarium)
export interface ParameterRecord {
  id: string;
  aquarium_id: string;
  date: string;
  temperature?: number;
  ph?: number;
  ammonia?: number;
  nitrite?: number;
  nitrate?: number;
  gh?: number;
  kh?: number;
  notes?: string;
}

// Tasks / Calendar
export type TaskType =
  | 'water_change' | 'feeding' | 'filter_clean'
  | 'fertilizer' | 'medication' | 'parameter_check' | 'custom';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface AquariumTask {
  id: string;
  aquarium_id: string;
  type: TaskType;
  title: string;
  description?: string;
  due_date: string;
  recurrence: RecurrenceType;
  completed: boolean;
  completed_at?: string;
  notification_id?: string;
}

// Fish Suggestions
export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

export interface FishSuggestion {
  id: string;
  user_id: string;
  user_name: string;
  status: SuggestionStatus;
  created_at: string;
  reviewed_at?: string;
  reject_reason?: string;
  // Basic fish info
  common_name: string;
  scientific_name: string;
  family?: string;
  origin?: string;
  // Parameters (optional — user may not know all)
  temp_min?: number;
  temp_max?: number;
  ph_min?: number;
  ph_max?: number;
  gh_min?: number;
  gh_max?: number;
  adult_size_cm?: number;
  min_tank_liters?: number;
  water_type?: WaterType;
  // Extra
  description?: string;
  image_url?: string;
  notes?: string; // user's reason for suggestion
}

// Chat
export interface Conversation {
  id: string;
  user_id: string;
  user?: User;
  status: 'open' | 'closed';
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: 'user' | 'admin' | 'ai';
  content: string;
  image_url?: string;
  created_at: string;
}

// Achievements
export type AchievementId =
  | 'first_parameter'
  | 'first_fish'
  | 'water_change_done'
  | 'first_breeding'
  | 'perfect_10'
  | 'schooling_complete'
  | 'biotope_authentic'
  | 'multi_aquarist'
  | 'analyst'
  | 'master';

export type AchievementRarity = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;         // emoji
  rarity: AchievementRarity;
  hint: string;         // shown while locked
}

export interface AchievementUnlock {
  id: AchievementId;
  unlockedAt: string;   // ISO date
}

// Navigation
export type RootStackParamList = {
  Auth: undefined;
  UserApp: undefined;
  AdminApp: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type UserTabParamList = {
  Home: undefined;
  Aquariums: undefined;
  Fish: undefined;
  Parameters: undefined;
  Flora: undefined;
  Tasks: undefined;
  Profile: undefined;
  Breeding: undefined;
  Community: undefined;
  Chat: undefined;
};

export type AdminDrawerParamList = {
  AdminDashboard: undefined;
  Conversations: undefined;
  ManageFish: undefined;
  Users: undefined;
  Notifications: undefined;
};
