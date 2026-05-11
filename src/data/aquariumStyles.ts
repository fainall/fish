import { AquariumStyle, WaterType } from '../types';

export interface StyleParams {
  temp_min: number;
  temp_max: number;
  ph_min: number;
  ph_max: number;
  gh_min: number;
  gh_max: number;
  kh_min: number;
  kh_max: number;
}

export interface AquariumStyleInfo {
  id: AquariumStyle;
  label: string;
  icon: string;
  color: string;
  waterType: WaterType;
  description: string;
  params: StyleParams;
  example_fish: string[];
  tips: string[];
}

export const AQUARIUM_STYLES: AquariumStyleInfo[] = [
  {
    id: 'amazonico',
    label: 'Amazónico',
    icon: '🌿',
    color: '#2e7d32',
    waterType: 'freshwater',
    description: 'Replica el río Amazonas: agua oscura (blackwater), suave y ácida con hojas de catappa, ramas y poca luz.',
    params: { temp_min: 24, temp_max: 29, ph_min: 5.5, ph_max: 7.0, gh_min: 0, gh_max: 8, kh_min: 0, kh_max: 4 },
    example_fish: ['Tetra cardenal', 'Discus', 'Altum angelfish', 'Apistogramma', 'Corydoras', 'Arawana'],
    tips: [
      'Usa hojas de catappa (almendro tropical) para acidificar el agua naturalmente.',
      'Filtra con turba para simular el ácido húmico del Amazonas.',
      'Iluminación tenue o filtrada por plantas flotantes.',
      'Sustrato oscuro (arena negra) para resaltar los colores de los peces.',
    ],
  },
  {
    id: 'tropical',
    label: 'Tropical general',
    icon: '🐠',
    color: '#0077b6',
    waterType: 'freshwater',
    description: 'Acuario comunitario tropical con parámetros equilibrados, compatible con la mayoría de especies del mercado.',
    params: { temp_min: 24, temp_max: 27, ph_min: 6.5, ph_max: 7.5, gh_min: 5, gh_max: 15, kh_min: 3, kh_max: 10 },
    example_fish: ['Tetra neón', 'Guppy', 'Molly', 'Platy', 'Barbo tigre', 'Betta'],
    tips: [
      'Parámetros muy estables facilitan la adaptación de peces importados.',
      'Ideal para principiantes por la amplia tolerancia de las especies.',
      'Cambios de agua del 20-25% semanales mantienen el equilibrio.',
    ],
  },
  {
    id: 'agua_fria',
    label: 'Agua fría',
    icon: '❄️',
    color: '#00acc1',
    waterType: 'freshwater',
    description: 'Para especies de clima templado que no toleran calor. No requiere calentador en climas frescos.',
    params: { temp_min: 10, temp_max: 20, ph_min: 7.0, ph_max: 8.0, gh_min: 8, gh_max: 20, kh_min: 5, kh_max: 12 },
    example_fish: ['Goldfish', 'Koi (interior)', 'Hillstream loach', 'Danio cebra', 'Rana de uñas africana'],
    tips: [
      'Evita mezclar con peces tropicales, necesitan temperaturas muy diferentes.',
      'El goldfish produce mucho amoniaco — sobredimensiona el filtro.',
      'En verano puede necesitar un enfriador (chiller) para agua de acuario.',
    ],
  },
  {
    id: 'plantado',
    label: 'Plantado / Aquascape',
    icon: '🌱',
    color: '#388e3c',
    waterType: 'freshwater',
    description: 'Ecosistema con plantas vivas como protagonistas. Requiere CO2, iluminación adecuada y fertilización.',
    params: { temp_min: 22, temp_max: 26, ph_min: 6.5, ph_max: 7.2, gh_min: 3, gh_max: 10, kh_min: 2, kh_max: 6 },
    example_fish: ['Tetra cardenal', 'Rasbora', 'Caridina (cherry shrimp)', 'Otocinclus', 'Pencilfish'],
    tips: [
      'CO2 inyectado a 20-30 ppm es clave para el crecimiento de las plantas.',
      'Iluminación 8h/día con espectro completo (6500-7000K).',
      'KH bajo (2-4) estabiliza el CO2 disuelto sin subir el pH.',
      'Fertilizantes completos (macro + micro) según demanda de las plantas.',
    ],
  },
  {
    id: 'africano',
    label: 'Biotopo africano',
    icon: '🏔️',
    color: '#f57c00',
    waterType: 'freshwater',
    description: 'Lagos Malawi, Tanganica o Victoria. Agua dura, alcalina y muy oxigenada. Cíclidos territoriales y coloridos.',
    params: { temp_min: 24, temp_max: 28, ph_min: 7.5, ph_max: 9.0, gh_min: 10, gh_max: 25, kh_min: 8, kh_max: 20 },
    example_fish: ['Aulonocara', 'Tropheus', 'Melanochromis', 'Pseudotropheus', 'Julidochromis', 'Frontosa'],
    tips: [
      'Aumenta la dureza con coral o rocas calcáreas para subir el pH.',
      'Decoración con rocas apiladas y pocas plantas (no toleran tanta alcalinidad).',
      'Buena circulación y oxigenación son esenciales para estos cíclidos.',
      'Sobredimensiona la población para distribuir la agresividad.',
    ],
  },
  {
    id: 'comunitario',
    label: 'Comunitario',
    icon: '👥',
    color: '#5c6bc0',
    waterType: 'freshwater',
    description: 'Mezcla pacífica de especies compatibles. Prioriza la coexistencia sobre el biotopo específico.',
    params: { temp_min: 23, temp_max: 27, ph_min: 6.8, ph_max: 7.5, gh_min: 5, gh_max: 15, kh_min: 3, kh_max: 10 },
    example_fish: ['Guppy', 'Corydoras', 'Platy', 'Tetra neón', 'Pleco común', 'Boca roja'],
    tips: [
      'Verifica la compatibilidad de cada especie antes de añadirla.',
      'Separa los niveles: peces de superficie, medio y fondo.',
      'Evita mezclar peces muy pequeños con especies grandes y hambrientas.',
    ],
  },
  {
    id: 'biotopico',
    label: 'Biotópico',
    icon: '🗺️',
    color: '#6d4c41',
    waterType: 'freshwater',
    description: 'Réplica fiel de un ecosistema natural específico (río asiático, africano, sudamericano). Prioriza autenticidad geográfica y científica.',
    params: { temp_min: 22, temp_max: 28, ph_min: 6.0, ph_max: 7.8, gh_min: 2, gh_max: 12, kh_min: 1, kh_max: 8 },
    example_fish: ['Según la región elegida', 'Solo especies del mismo hábitat natural', 'Invertebrados nativos del biotopo'],
    tips: [
      'Investiga el hábitat natural exacto: sustrato, plantas, peces y química del agua.',
      'Solo usa especies que coexisten en la misma región geográfica.',
      'El sustrato, ramas y plantas deben ser típicos del ecosistema objetivo.',
      'Fuentes como Seriously Fish y Fishbase ayudan a verificar datos del biotopo.',
    ],
  },
  {
    id: 'marino',
    label: 'Marino (peces)',
    icon: '🐡',
    color: '#0288d1',
    waterType: 'saltwater',
    description: 'Acuario marino con énfasis en peces. Sin o con pocos corales. Requiere osmosis inversa y sal marina de calidad.',
    params: { temp_min: 24, temp_max: 27, ph_min: 8.1, ph_max: 8.4, gh_min: 8, gh_max: 12, kh_min: 7, kh_max: 12 },
    example_fish: ['Pez payaso', 'Tang azul', 'Pez ángel', 'Pez mariposa', 'Gobio', 'Pez loro'],
    tips: [
      'Salinidad óptima: 1.023-1.025 (densidad relativa) o 34-36 ppt.',
      'Usa osmosis inversa para el agua de cambios — el cloro destruye el ecosistema.',
      'El ciclo de nitrógeno tarda más en agua salada (6-8 semanas).',
      'La proteína skimmer es esencial para eliminar materia orgánica.',
    ],
  },
  {
    id: 'arrecife',
    label: 'Arrecife (reef)',
    icon: '🪸',
    color: '#e91e63',
    waterType: 'saltwater',
    description: 'El ecosistema más complejo: corales vivos, invertebrados y peces marines. Requiere equipo de alta gama y mucha atención.',
    params: { temp_min: 25, temp_max: 27, ph_min: 8.2, ph_max: 8.4, gh_min: 9, gh_max: 12, kh_min: 8, kh_max: 12 },
    example_fish: ['Pez payaso', 'Chromis verde', 'Blenny', 'Mandarín', 'Dottyback'],
    tips: [
      'Los corales SPS requieren Ca 400-450 ppm, Mg 1250-1350 ppm, KH 8-12 dKH.',
      'Iluminación LED de alta intensidad con espectro marino (14000-20000K).',
      'Los cambios de parámetros deben ser graduales — los corales son muy sensibles.',
      'Sistema de dosificación automática (Balling/Kalkwasser) para estabilizar Ca/KH.',
    ],
  },
  {
    id: 'salobre',
    label: 'Salobre',
    icon: '🌊',
    color: '#00838f',
    waterType: 'brackish',
    description: 'Agua con salinidad intermedia entre dulce y marina. Ecosistema de estuarios y manglares.',
    params: { temp_min: 22, temp_max: 28, ph_min: 7.5, ph_max: 8.5, gh_min: 10, gh_max: 20, kh_min: 6, kh_max: 14 },
    example_fish: ['Molly vela (black molly)', 'Archer fish', 'Scat', 'Monodactylus', 'Fugu (pez globo)'],
    tips: [
      'Salinidad típica: 1.005-1.015 (salinidad específica).',
      'Muchas especies de agua salobre toleran tanto agua dulce como marina.',
      'El coral o roca viva sube el pH y la dureza naturalmente.',
    ],
  },
];

export const STYLES_BY_WATER: Record<WaterType, AquariumStyleInfo[]> = {
  freshwater: AQUARIUM_STYLES.filter(s => s.waterType === 'freshwater'),
  saltwater:  AQUARIUM_STYLES.filter(s => s.waterType === 'saltwater'),
  brackish:   AQUARIUM_STYLES.filter(s => s.waterType === 'brackish'),
};

export function getStyleInfo(id: AquariumStyle | undefined): AquariumStyleInfo | undefined {
  if (!id) return undefined;
  return AQUARIUM_STYLES.find(s => s.id === id);
}

export function isParamInRange(value: number, min: number, max: number): 'ideal' | 'out' {
  return value >= min && value <= max ? 'ideal' : 'out';
}

// Returns fish whose parameters overlap with the style's ranges
export function getFishForStyle<T extends {
  water_type: WaterType;
  temp_min: number; temp_max: number;
  ph_min: number;   ph_max: number;
  gh_min: number;   gh_max: number;
}>(style: AquariumStyle, fishList: T[]): T[] {
  const info = getStyleInfo(style);
  if (!info) return [];
  const { params, waterType } = info;
  return fishList.filter(f =>
    f.water_type === waterType &&
    f.temp_max >= params.temp_min && f.temp_min <= params.temp_max &&
    f.ph_max  >= params.ph_min  && f.ph_min  <= params.ph_max  &&
    f.gh_max  >= params.gh_min  && f.gh_min  <= params.gh_max
  );
}

// How well a fish fits the style (0-100)
export function styleFitScore<T extends {
  temp_min: number; temp_max: number;
  ph_min: number;   ph_max: number;
  gh_min: number;   gh_max: number;
}>(style: AquariumStyle, fish: T): number {
  const info = getStyleInfo(style);
  if (!info) return 0;
  const { params } = info;

  const overlap = (fMin: number, fMax: number, sMin: number, sMax: number) => {
    const lo = Math.max(fMin, sMin);
    const hi = Math.min(fMax, sMax);
    if (hi < lo) return 0;
    const fishRange = fMax - fMin || 1;
    return Math.min(1, (hi - lo) / fishRange);
  };

  const t = overlap(fish.temp_min, fish.temp_max, params.temp_min, params.temp_max);
  const p = overlap(fish.ph_min,   fish.ph_max,   params.ph_min,   params.ph_max);
  const g = overlap(fish.gh_min,   fish.gh_max,   params.gh_min,   params.gh_max);
  return Math.round(((t + p + g) / 3) * 100);
}
