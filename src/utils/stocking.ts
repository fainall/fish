/**
 * Calculadora de stock profesional — modelo multi-restricción.
 *
 * Reemplaza la regla simplista cm/litro con un sistema basado en:
 * 1. Bioload real (masa estimada × actividad × dieta)
 * 2. Distribución por columna de agua
 * 3. Espacio territorial para especies agresivas
 * 4. Requisitos mínimos de tanque por especie
 * 5. Cardúmenes completos
 *
 * Referencia: AqAdvisor, Aqulator, Aquarium Science, ThinkFish
 */
import { Fish, WaterLevel, AquariumStyle, TankDisplacement } from '../types';

// ── Tipos ────────────────────────────────────────────────────────────────────

export type BodyShape = 'very_slim' | 'slim' | 'medium' | 'robust' | 'very_robust';
export type ActivityLevel = 'sedentary' | 'moderate' | 'active' | 'very_active';
export type DietCategory = 'herbivore' | 'omnivore' | 'carnivore' | 'heavy_waste';
export type StockSeverity = 'ok' | 'caution' | 'danger';

export interface FishEntry {
  fishData: Fish;
  qty: number;
}

export interface StockResult {
  /** Porcentaje global de stock (0-150+) */
  stockPercent: number;
  severity: StockSeverity;
  label: string;
  /** Desglose individual por pez */
  fishBreakdown: FishBioload[];
  /** Alertas específicas */
  alerts: StockAlert[];
  /** Distribución por columna */
  columnDistribution: ColumnDistribution;
  /** Bioload total en unidades normalizadas (1 Cardinal Tetra ≈ 1.0) */
  totalBioload: number;
  /** Capacidad estimada del tanque en unidades de bioload */
  tankCapacity: number;
  /** Litros reales de agua después de restar desplazamiento */
  effectiveVolume: number;
  /** Litros desplazados por sustrato, rocas, troncos, etc. */
  displacedLiters: number;
}

export interface FishBioload {
  fishId: string;
  commonName: string;
  qty: number;
  bioloadPerFish: number;
  bioloadTotal: number;
  /** Porcentaje del bioload total que ocupa esta especie */
  sharePct: number;
  bodyShape: BodyShape;
  activityLevel: ActivityLevel;
}

export interface StockAlert {
  type: 'critical' | 'warning' | 'info';
  icon: string;
  title: string;
  body: string;
}

export interface ColumnDistribution {
  top: number;     // % de peces en superficie
  middle: number;  // % en zona media
  bottom: number;  // % en fondo
}

// ── Constantes ───────────────────────────────────────────────────────────────

/** Multiplicadores de forma corporal para estimar masa relativa */
const BODY_SHAPE_MULT: Record<BodyShape, number> = {
  very_slim:   0.4,   // anguila, pez aguja, kuhli loach
  slim:        0.65,  // tetra, rasbora, danio
  medium:      1.0,   // barbo, guppy, platy
  robust:      1.5,   // cíclido, goldfish, gourami
  very_robust: 2.2,   // oscar, pleco, disco
};

/** Multiplicadores de actividad metabólica */
const ACTIVITY_MULT: Record<ActivityLevel, number> = {
  sedentary:   0.75,  // pleco, corydora en reposo, otocinclus
  moderate:    1.0,   // guppy, tetra, rasbora
  active:      1.3,   // danio, barbo tigre, pez arcoíris
  very_active: 1.6,   // pez payaso, cirujano
};

/** Multiplicadores de dieta (producción de desechos) */
const DIET_MULT: Record<DietCategory, number> = {
  herbivore:   0.85,
  omnivore:    1.0,
  carnivore:   1.25,
  heavy_waste: 1.6,   // goldfish, pleco, oscar
};

/** Multiplicadores de agresión para espacio territorial */
const AGGRESSION_SPACE_MULT: Record<number, number> = {
  1: 1.0,   // pacífico
  2: 1.0,   // semi-pacífico
  3: 1.15,  // semi-agresivo
  4: 1.4,   // agresivo (necesita más espacio)
  5: 1.8,   // muy agresivo (cíclidos grandes, bettas machos)
};

// ── Heurísticas de clasificación ─────────────────────────────────────────────

/** Familias conocidas por forma robusta/muy robusta */
const ROBUST_FAMILIES = new Set([
  'cichlidae', 'osphronemidae', 'helostomatidae',
]);
const VERY_ROBUST_FAMILIES = new Set([
  'loricariidae', 'callichthyidae',
]);
const SLIM_FAMILIES = new Set([
  'characidae', 'cyprinidae', 'poeciliidae', 'melanotaeniidae',
  'aplocheilidae', 'nothobranchiidae',
]);

/** Palabras clave en dieta para clasificar */
const CARNIVORE_KEYWORDS = ['carnív', 'piscív', 'predador', 'carniv', 'pisciv', 'predator', 'insectiv', 'meaty'];
const HERBIVORE_KEYWORDS = ['herbív', 'herbiv', 'algae', 'algas', 'vegetarian'];
const HEAVY_WASTE_KEYWORDS = ['goldfish', 'pleco', 'oscar', 'arowana', 'pacu'];

/**
 * Estima la forma corporal a partir de datos disponibles.
 * Sin un campo explícito, usamos familia + tamaño + comportamiento.
 */
export function estimateBodyShape(fish: Fish): BodyShape {
  const family = fish.family?.toLowerCase() ?? '';
  const name   = fish.common_name?.toLowerCase() ?? '';
  const sci    = fish.scientific_name?.toLowerCase() ?? '';

  // Peces tipo anguila
  if (name.includes('anguila') || name.includes('eel') || name.includes('kuhli') ||
      name.includes('loach') || sci.includes('pangio') || sci.includes('mastacembelus')) {
    return 'very_slim';
  }

  // Peces muy robustos (plecos, discos, oscars)
  if (VERY_ROBUST_FAMILIES.has(family) ||
      name.includes('pleco') || name.includes('disco') || name.includes('discus') ||
      name.includes('oscar') || name.includes('arowana') || name.includes('pacu') ||
      name.includes('goldfish') || name.includes('carpa')) {
    return 'very_robust';
  }

  // Cíclidos y gouramis — robustos
  if (ROBUST_FAMILIES.has(family) ||
      name.includes('cíclido') || name.includes('cichlid') || name.includes('gourami') ||
      name.includes('ángel') || name.includes('angel') || name.includes('pez globo') ||
      fish.adult_size_cm >= 20) {
    return 'robust';
  }

  // Tetras, rasboras, guppies — delgados
  if (SLIM_FAMILIES.has(family) ||
      name.includes('tetra') || name.includes('rasbora') || name.includes('danio') ||
      name.includes('guppy') || name.includes('neon') || name.includes('betta') ||
      fish.adult_size_cm <= 5) {
    return 'slim';
  }

  return 'medium';
}

/** Estima nivel de actividad */
export function estimateActivity(fish: Fish): ActivityLevel {
  const name   = fish.common_name?.toLowerCase() ?? '';
  const family = fish.family?.toLowerCase() ?? '';

  // Sedentarios
  if (name.includes('pleco') || name.includes('loach') || name.includes('otocinclus') ||
      name.includes('ancistrus') || family === 'loricariidae' ||
      fish.water_level === 'bottom') {
    return 'sedentary';
  }

  // Muy activos
  if (name.includes('danio') || name.includes('arcoíris') || name.includes('rainbow') ||
      name.includes('barbo') || name.includes('barb') ||
      family === 'melanotaeniidae') {
    return 'very_active';
  }

  // Activos
  if ((fish.aggression ?? 1) >= 4 || name.includes('cíclido') || name.includes('cichlid') ||
      fish.adult_size_cm >= 15) {
    return 'active';
  }

  return 'moderate';
}

/** Clasifica tipo de dieta para estimar producción de desechos */
export function estimateDietCategory(fish: Fish): DietCategory {
  const diet = (fish.diet ?? '').toLowerCase();
  const name = fish.common_name?.toLowerCase() ?? '';

  // Heavy waste producers
  if (HEAVY_WASTE_KEYWORDS.some(kw => name.includes(kw) || diet.includes(kw))) {
    return 'heavy_waste';
  }
  if (CARNIVORE_KEYWORDS.some(kw => diet.includes(kw))) return 'carnivore';
  if (HERBIVORE_KEYWORDS.some(kw => diet.includes(kw))) return 'herbivore';
  return 'omnivore';
}

// ── Cálculo de bioload ───────────────────────────────────────────────────────

/**
 * Calcula el bioload de un pez individual en unidades normalizadas.
 * Referencia: 1 Cardinal Tetra (2.5cm, slim, moderate, omnivore) ≈ 1.0
 *
 * La masa escala cúbicamente con el tamaño, no linealmente.
 * Un pez de 10cm no produce 4× el bioload de uno de 2.5cm — produce ~64×
 * en masa pura, pero ajustamos con raíz cuadrada para un modelo práctico.
 */
export function calcFishBioload(fish: Fish): number {
  const size     = fish.adult_size_cm;
  const shape    = estimateBodyShape(fish);
  const activity = estimateActivity(fish);
  const diet     = estimateDietCategory(fish);

  // Masa relativa: usamos size^2.3 para modelar escalado no-lineal
  // (entre cuadrático y cúbico — los peces no son esferas perfectas)
  const REF_SIZE = 2.5; // Cardinal Tetra como referencia
  const massRelative = Math.pow(size / REF_SIZE, 2.3);

  const bioload = massRelative
    * BODY_SHAPE_MULT[shape]
    * ACTIVITY_MULT[activity]
    * DIET_MULT[diet]
    * (AGGRESSION_SPACE_MULT[fish.aggression ?? 1] ?? 1.0);

  return Math.round(bioload * 100) / 100;
}

// ── Capacidad del tanque ─────────────────────────────────────────────────────

// ── Factores de desplazamiento (litros por kg / unidad) ─────────────────────

const DISPLACEMENT_FACTORS = {
  substrate_kg:      0.6,   // grava, arena, aquasoil → ~0.6L por kg
  rocks_kg:          0.38,  // roca, lava rock → ~0.38L por kg
  wood_kg:           0.8,   // troncos, raíces → ~0.8L por kg
  plants_kg:         0.5,   // biomasa vegetal (raíces+masa) → ~0.5L por kg
  equipment_liters:  1.0,   // litros directos (filtro interno, calentador, etc.)
} as const;

/**
 * Calcula litros desplazados por elementos del tanque.
 * Si no hay datos → 15% del volumen como estimación conservadora.
 */
export function calcDisplacedLiters(volumeLiters: number, displacement?: TankDisplacement): number {
  if (!displacement) return volumeLiters * 0.15;
  const hasAny = Object.values(displacement).some(v => v != null && v > 0);
  if (!hasAny) return volumeLiters * 0.15;

  let displaced = 0;
  if (displacement.substrate_kg)     displaced += displacement.substrate_kg     * DISPLACEMENT_FACTORS.substrate_kg;
  if (displacement.rocks_kg)         displaced += displacement.rocks_kg         * DISPLACEMENT_FACTORS.rocks_kg;
  if (displacement.wood_kg)          displaced += displacement.wood_kg          * DISPLACEMENT_FACTORS.wood_kg;
  if (displacement.plants_kg)        displaced += displacement.plants_kg        * DISPLACEMENT_FACTORS.plants_kg;
  if (displacement.equipment_liters) displaced += displacement.equipment_liters * DISPLACEMENT_FACTORS.equipment_liters;

  // Nunca desplazar más del 60% del tanque (sanity check)
  return Math.min(displaced, volumeLiters * 0.6);
}

/**
 * Volumen efectivo del tanque descontando desplazamiento.
 * Usar en toda validación de litros mínimos, flora, wishlist, etc.
 */
export function getEffectiveVolume(volumeLiters: number, displacement?: TankDisplacement): number {
  const displaced = calcDisplacedLiters(volumeLiters, displacement);
  return Math.max(Math.round((volumeLiters - displaced) * 10) / 10, volumeLiters * 0.3);
}

/**
 * Estima la capacidad del tanque en unidades de bioload.
 * Base: ~1 unidad de bioload por 2 litros de agua efectiva.
 */
export function calcTankCapacity(volumeLiters: number, displacement?: TankDisplacement): { capacity: number; effectiveVolume: number; displacedLiters: number } {
  const displacedLiters = calcDisplacedLiters(volumeLiters, displacement);
  const effectiveVolume = Math.max(volumeLiters - displacedLiters, volumeLiters * 0.3);
  const capacity = effectiveVolume / 2;
  return { capacity, effectiveVolume: Math.round(effectiveVolume * 10) / 10, displacedLiters: Math.round(displacedLiters * 10) / 10 };
}

// ── Distribución por columna de agua ─────────────────────────────────────────

function calcColumnDistribution(fishList: FishEntry[]): ColumnDistribution {
  let top = 0, middle = 0, bottom = 0, total = 0;
  for (const { fishData, qty } of fishList) {
    total += qty;
    switch (fishData.water_level) {
      case 'top':    top    += qty; break;
      case 'bottom': bottom += qty; break;
      case 'all':    top += qty * 0.33; middle += qty * 0.34; bottom += qty * 0.33; break;
      default:       middle += qty; break;
    }
  }
  if (total === 0) return { top: 0, middle: 0, bottom: 0 };
  return {
    top:    Math.round((top / total) * 100),
    middle: Math.round((middle / total) * 100),
    bottom: Math.round((bottom / total) * 100),
  };
}

// ── Alertas inteligentes ─────────────────────────────────────────────────────

function generateAlerts(
  fishList: FishEntry[],
  volumeLiters: number,
  stockPercent: number,
  displacement?: TankDisplacement,
): StockAlert[] {
  const alerts: StockAlert[] = [];

  // Sobrepoblación
  if (stockPercent > 100) {
    alerts.push({
      type: 'critical',
      icon: '🚨',
      title: 'Tanque sobrepoblado',
      body: `La carga biológica supera la capacidad del tanque (${stockPercent}%). Riesgo de picos de amoníaco y estrés.`,
    });
  } else if (stockPercent > 80) {
    alerts.push({
      type: 'warning',
      icon: '⚠️',
      title: 'Carga alta',
      body: `Stock al ${stockPercent}%. Requiere mantenimiento frecuente y buena filtración.`,
    });
  }

  // Peces que necesitan tanque más grande (comparar contra volumen efectivo)
  const effVol = getEffectiveVolume(volumeLiters, displacement);
  for (const { fishData, qty } of fishList) {
    if (fishData.min_tank_liters > effVol) {
      alerts.push({
        type: 'critical',
        icon: '📏',
        title: `${fishData.common_name}: tanque insuficiente`,
        body: `Necesita mínimo ${fishData.min_tank_liters}L, tu acuario tiene ~${Math.round(effVol)}L efectivos.`,
      });
    }
  }

  // Cardúmenes incompletos
  for (const { fishData, qty } of fishList) {
    if (fishData.is_schooling) {
      const minSchool = fishData.schooling_min ?? 6;
      if (qty < minSchool) {
        alerts.push({
          type: 'warning',
          icon: '👥',
          title: `${fishData.common_name}: cardumen incompleto`,
          body: `Tienes ${qty}, necesita mínimo ${minSchool} para bienestar. Los peces de cardumen sueltos se estresan.`,
        });
      }
    }
  }

  // Peces grandes con alto bioload
  for (const { fishData, qty } of fishList) {
    const bioload = calcFishBioload(fishData);
    if (bioload >= 15) {
      alerts.push({
        type: 'info',
        icon: '🐋',
        title: `${fishData.common_name}: alto productor de desechos`,
        body: `Cada uno genera ${bioload.toFixed(1)}× la carga de un tetra cardinal. Cambios de agua más frecuentes recomendados.`,
      });
    }
  }

  // Distribución desbalanceada
  const dist = calcColumnDistribution(fishList);
  if (dist.top > 70) {
    alerts.push({
      type: 'info', icon: '🔼',
      title: 'Mayoría en superficie',
      body: 'Considera agregar peces de media agua o fondo para un acuario más equilibrado.',
    });
  } else if (dist.bottom > 70) {
    alerts.push({
      type: 'info', icon: '🔽',
      title: 'Mayoría en el fondo',
      body: 'Considera agregar peces de media agua o superficie para aprovechar todo el tanque.',
    });
  }

  // Agresión alta + peces pacíficos
  const hasAggressive = fishList.some(f => (f.fishData.aggression ?? 1) >= 4);
  const hasPeaceful   = fishList.some(f => (f.fishData.aggression ?? 1) <= 2);
  if (hasAggressive && hasPeaceful) {
    alerts.push({
      type: 'warning',
      icon: '⚔️',
      title: 'Mezcla agresivo + pacífico',
      body: 'Tienes peces agresivos junto a pacíficos. Vigila señales de estrés y ofrece escondites.',
    });
  }

  return alerts;
}

// ── Función principal ────────────────────────────────────────────────────────

export function calculateStock(
  fishList: FishEntry[],
  volumeLiters: number,
  displacement?: TankDisplacement,
): StockResult {
  const tank = calcTankCapacity(volumeLiters, displacement);

  if (fishList.length === 0 || volumeLiters <= 0) {
    return {
      stockPercent: 0,
      severity: 'ok',
      label: 'Sin peces',
      fishBreakdown: [],
      alerts: [],
      columnDistribution: { top: 0, middle: 0, bottom: 0 },
      totalBioload: 0,
      tankCapacity: tank.capacity,
      effectiveVolume: tank.effectiveVolume,
      displacedLiters: tank.displacedLiters,
    };
  }

  const tankCapacity = tank.capacity;
  let totalBioload   = 0;

  const fishBreakdown: FishBioload[] = fishList.map(({ fishData, qty }) => {
    const bioloadPerFish = calcFishBioload(fishData);
    const bioloadTotal   = bioloadPerFish * qty;
    totalBioload += bioloadTotal;
    return {
      fishId:        fishData.id,
      commonName:    fishData.common_name,
      qty,
      bioloadPerFish,
      bioloadTotal,
      sharePct:      0, // se calcula después
      bodyShape:     estimateBodyShape(fishData),
      activityLevel: estimateActivity(fishData),
    };
  });

  // Calcular porcentaje de participación
  fishBreakdown.forEach(fb => {
    fb.sharePct = totalBioload > 0 ? Math.round((fb.bioloadTotal / totalBioload) * 100) : 0;
  });

  // Ordenar por mayor contribución
  fishBreakdown.sort((a, b) => b.bioloadTotal - a.bioloadTotal);

  const stockPercent = Math.round((totalBioload / tankCapacity) * 100);

  const severity: StockSeverity =
    stockPercent > 100 ? 'danger' :
    stockPercent > 80  ? 'caution' : 'ok';

  const label =
    stockPercent > 100 ? 'Sobrepoblado' :
    stockPercent > 80  ? 'Carga alta' :
    stockPercent > 50  ? 'Moderado' :
    stockPercent > 0   ? 'Espacio disponible' : 'Sin peces';

  const alerts = generateAlerts(fishList, volumeLiters, stockPercent, displacement);
  const columnDistribution = calcColumnDistribution(fishList);

  return {
    stockPercent,
    severity,
    label,
    fishBreakdown,
    alerts,
    columnDistribution,
    totalBioload: Math.round(totalBioload * 10) / 10,
    tankCapacity: Math.round(tankCapacity * 10) / 10,
    effectiveVolume: tank.effectiveVolume,
    displacedLiters: tank.displacedLiters,
  };
}
