import { Fish } from '../types';

export type BreedingMethod =
  | 'bubble_nest'    // Betta, gourami
  | 'egg_scatterer'  // Tetras, danios, barbs
  | 'mouthbrooder'   // Cíclidos africanos
  | 'substrate'      // Cíclidos americanos, corydoras
  | 'livebearer'     // Guppy, molly, platy
  | 'cave_spawner'   // Apistogramma, plecos
  | 'open_water';    // Discus, angelfish

export interface BreedingProfile {
  method: BreedingMethod;
  method_label: string;
  difficulty: 1 | 2 | 3 | 4 | 5; // 1=easy, 5=expert
  gestation_days: string;          // "2-3 días (eclosión)", "4 semanas", etc.
  clutch_size: string;             // "50-200 huevos", "20-50 crías"
  trigger_conditions: string[];    // Condiciones que desencadenan la puesta
  breeding_temp_delta: number;     // Subir/bajar X°C respecto al normal
  breeding_ph_ideal: string;
  water_softness: 'soft' | 'medium' | 'hard';
  feeding_schedule: string[];      // Alimentos recomendados
  fry_first_food: string;
  special_requirements: string[];
  warning: string | null;
}

const PROFILES: Record<string, BreedingProfile> = {
  'Betta splendens': {
    method: 'bubble_nest', method_label: 'Nido de burbujas',
    difficulty: 2, gestation_days: '24-48h (eclosión)', clutch_size: '100-500 huevos',
    trigger_conditions: [
      'Temperatura 27-29°C (2°C sobre lo normal)',
      'Cambio de agua frío del 20% para simular lluvia',
      'Presencia de hembra en recipiente separado visible',
      'Plantas flotantes o espuma de poliestireno para anclar el nido',
    ],
    breeding_temp_delta: 2,
    breeding_ph_ideal: '6.0-7.0',
    water_softness: 'soft',
    feeding_schedule: ['Artemia viva 2x/día', 'Gusanos de sangre congelados', 'Dafnia viva'],
    fry_first_food: 'Infusorios o yema de huevo hervida (5 días), luego nauplios de artemia',
    special_requirements: [
      'El macho construye nido de burbujas en la superficie — proveer zona tranquila',
      'Introducir hembra solo cuando nido esté listo — retirarla tras la puesta',
      'El macho cuida los huevos y alevines — NO molestar',
      'Recipiente cubierto para mantener temperatura y humedad del aire',
    ],
    warning: 'Macho puede matar a la hembra si no está receptiva. Observar constantemente.',
  },
  'Paracheirodon innesi': {
    method: 'egg_scatterer', method_label: 'Dispersor de huevos',
    difficulty: 3, gestation_days: '24h (eclosión)', clutch_size: '100-300 huevos',
    trigger_conditions: [
      'Temperatura 22-24°C (reducir 2°C)',
      'pH 5.5-6.5 (agua muy suave y ácida)',
      'GH < 4 (usar agua osmotizada)',
      'Oscuridad total — los huevos son fotosensibles',
      'Cambio del 30% con agua más fría',
    ],
    breeding_temp_delta: -2,
    breeding_ph_ideal: '5.5-6.5',
    water_softness: 'soft',
    feeding_schedule: ['Artemia viva 3x/día', 'Microgusanos', 'Dafnia pequeña'],
    fry_first_food: 'Infusorios (3 días), luego nauplios de artemia recién eclosionados',
    special_requirements: [
      'Tanque de cría completamente oscuro — cubrir con cartón opaco',
      'Mopas de Java moss o estropajo para que depositen huevos',
      'Retirar adultos tras la puesta (se comen los huevos)',
      'Filtro de esponja de flujo muy bajo',
    ],
    warning: 'Especie difícil de criar. Requiere agua muy blanda y ácida.',
  },
  'Poecilia reticulata': {
    method: 'livebearer', method_label: 'Vivíparo',
    difficulty: 1, gestation_days: '21-30 días (preñez)', clutch_size: '20-100 crías',
    trigger_conditions: [
      'Temperatura 26-28°C',
      'Buena alimentación variada 2-3 semanas previas',
      'Proporción 1 macho : 3 hembras',
      'Agua limpia con nitrato < 20 ppm',
    ],
    breeding_temp_delta: 1,
    breeding_ph_ideal: '7.0-7.5',
    water_softness: 'medium',
    feeding_schedule: ['Pellets de calidad', 'Artemia viva', 'Espinaca hervida (fibra)'],
    fry_first_food: 'Polvo de fry (First Bites), nauplios de artemia, escamas trituradas',
    special_requirements: [
      'Trampa de parición o abundante vegetación para esconder crías',
      'Los adultos pueden comerse las crías — separar inmediatamente',
      'Hembra puede almacenar esperma y tener varias camadas',
    ],
    warning: null,
  },
  'Symphysodon discus': {
    method: 'substrate', method_label: 'Sustrato (cuidado biparental)',
    difficulty: 5, gestation_days: '48-60h (eclosión)', clutch_size: '100-400 huevos',
    trigger_conditions: [
      'Temperatura 29-31°C (1-2°C sobre lo normal)',
      'pH 6.0-6.8',
      'GH < 6 (agua muy blanda)',
      'Pareja establecida con vínculo fuerte',
      'Cono de puesta o sustrato liso inclinado',
    ],
    breeding_temp_delta: 2,
    breeding_ph_ideal: '6.0-6.8',
    water_softness: 'soft',
    feeding_schedule: ['Corazón de res raspado 2x/día', 'Artemia viva', 'Gusanos blancos'],
    fry_first_food: 'Moco de los padres (primeros 10-14 días natural), luego nauplios',
    special_requirements: [
      'La pareja se forma naturalmente — no se puede forzar',
      'Los alevines se alimentan del moco corporal de ambos padres',
      'Cambios de agua del 10-15% diarios para calidad óptima',
      'Tanque específico sin otros peces',
    ],
    warning: 'Especie para acuaristas expertos. Parámetros críticos y cuidados intensivos.',
  },
};

const DEFAULT_PROFILE: BreedingProfile = {
  method: 'substrate', method_label: 'Sustrato',
  difficulty: 3, gestation_days: '2-7 días (eclosión)', clutch_size: '50-200 huevos',
  trigger_conditions: [
    'Elevar temperatura 1-2°C sobre el rango normal',
    'Cambios de agua del 20-30% con agua ligeramente más fría',
    'Dieta rica en vivos o congelados 2 semanas antes',
    'Verificar que haya un macho y hembra maduros',
  ],
  breeding_temp_delta: 1,
  breeding_ph_ideal: 'Rango normal de la especie',
  water_softness: 'medium',
  feeding_schedule: ['Artemia viva 2x/día', 'Gusanos de sangre congelados', 'Dafnia'],
  fry_first_food: 'Nauplios de artemia, infusorios o polvo comercial para alevines',
  special_requirements: [
    'Tanque de cría separado de mínimo 40L',
    'Filtración con esponja (no aspira huevos)',
    'Escondites y plantas para la hembra',
  ],
  warning: null,
};

export function getBreedingProfile(fish: Fish): BreedingProfile {
  return PROFILES[fish.scientific_name] ?? DEFAULT_PROFILE;
}

export const METHOD_ICONS: Record<BreedingMethod, string> = {
  bubble_nest:   '🫧',
  egg_scatterer: '🔵',
  mouthbrooder:  '👄',
  substrate:     '🪨',
  livebearer:    '🐣',
  cave_spawner:  '🕳️',
  open_water:    '🌊',
};

export const DIFFICULTY_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: 'Muy fácil',  color: '#00e676' },
  2: { label: 'Fácil',      color: '#69f0ae' },
  3: { label: 'Moderado',   color: '#ffab40' },
  4: { label: 'Difícil',    color: '#ff7043' },
  5: { label: 'Experto',    color: '#ef5350' },
};
