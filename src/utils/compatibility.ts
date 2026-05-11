import { Fish, CompatibilityResult, CompatibilityCheck } from '../types';

// ── Hard-coded pair overrides ─────────────────────────────────────────────────
interface PairRule {
  a: string; b: string;
  result: CompatibilityResult;
  reason: string;
}

const PAIR_RULES: PairRule[] = [
  {
    a: 'Betta splendens', b: 'Betta splendens',
    result: 'incompatible',
    reason: 'Machos Betta son extremadamente territoriales entre sí y se atacarán hasta la muerte.',
  },
  {
    a: 'Betta splendens', b: 'Poecilia reticulata',
    result: 'caution',
    reason: 'El Betta puede atacar al Guppy confundiéndolo con otro Betta por sus aletas largas.',
  },
  {
    a: 'Betta splendens', b: 'Poecilia wingei',
    result: 'caution',
    reason: 'El Betta puede atacar al Endler por su colorido similar al suyo.',
  },
  {
    a: 'Symphysodon discus', b: 'Paracheirodon innesi',
    result: 'incompatible',
    reason: 'El Disco requiere 28-32°C; demasiado para el Neón Tetra (máx 26°C).',
  },
  {
    a: 'Pygocentrus nattereri', b: 'Pygocentrus nattereri',
    result: 'caution',
    reason: 'Las pirañas conviven en grupo pero pueden agredirse en espacios pequeños.',
  },
  {
    a: 'Carassius auratus', b: 'Poecilia reticulata',
    result: 'incompatible',
    reason: 'El Goldfish prefiere agua fría (10-24°C); los Guppies necesitan tropical (22-28°C).',
  },
];

function findPairRule(a: Fish, b: Fish): PairRule | null {
  return PAIR_RULES.find(r =>
    (r.a === a.scientific_name && r.b === b.scientific_name) ||
    (r.a === b.scientific_name && r.b === a.scientific_name)
  ) ?? null;
}

// ── Range helpers ─────────────────────────────────────────────────────────────
function overlapSize(min1: number, max1: number, min2: number, max2: number): number {
  return Math.max(0, Math.min(max1, max2) - Math.max(min1, min2));
}

/** How well do the two ranges overlap — 0 (none) to 1 (perfect) */
function overlapScore(min1: number, max1: number, min2: number, max2: number): number {
  const overlap = overlapSize(min1, max1, min2, max2);
  if (overlap <= 0) return 0;
  // Ratio of overlap to the smaller of the two ranges
  const smaller = Math.min(max1 - min1, max2 - min2);
  return smaller > 0 ? Math.min(1, overlap / smaller) : 0;
}

type ParamFlag = 'ok' | 'narrow' | 'fail';

function evalTemp(a: Fish, b: Fish): { flag: ParamFlag; score: number; msg?: string } {
  const overlap = overlapSize(a.temp_min, a.temp_max, b.temp_min, b.temp_max);
  if (overlap <= 0) return {
    flag: 'fail', score: 0,
    msg: `Temperatura incompatible: ${a.common_name} (${a.temp_min}-${a.temp_max}°C) vs ${b.common_name} (${b.temp_min}-${b.temp_max}°C).`,
  };
  if (overlap < 2) return {
    flag: 'narrow', score: 0.3,
    msg: `Solapamiento de temperatura muy estrecho (${Math.max(a.temp_min, b.temp_min)}-${Math.min(a.temp_max, b.temp_max)}°C). Mantener temperatura estable.`,
  };
  return { flag: 'ok', score: overlapScore(a.temp_min, a.temp_max, b.temp_min, b.temp_max) };
}

function evalPh(a: Fish, b: Fish): { flag: ParamFlag; score: number; msg?: string } {
  const overlap = overlapSize(a.ph_min, a.ph_max, b.ph_min, b.ph_max);
  if (overlap <= 0) return {
    flag: 'fail', score: 0,
    msg: `pH incompatible: ${a.common_name} (${a.ph_min}-${a.ph_max}) vs ${b.common_name} (${b.ph_min}-${b.ph_max}).`,
  };
  if (overlap < 0.4) return {
    flag: 'narrow', score: 0.3,
    msg: `Rango de pH compartido muy estrecho (${Math.max(a.ph_min, b.ph_min).toFixed(1)}-${Math.min(a.ph_max, b.ph_max).toFixed(1)}). Monitorizar pH de cerca.`,
  };
  return { flag: 'ok', score: overlapScore(a.ph_min, a.ph_max, b.ph_min, b.ph_max) };
}

function evalGh(a: Fish, b: Fish): { flag: ParamFlag; score: number; msg?: string } {
  const overlap = overlapSize(a.gh_min, a.gh_max, b.gh_min, b.gh_max);
  if (overlap <= 0) {
    const softA = a.gh_max <= 8;  const hardB = b.gh_min >= 12;
    const softB = b.gh_max <= 8;  const hardA = a.gh_min >= 12;
    const soft  = softA ? a.common_name : b.common_name;
    const hard  = hardA ? a.common_name : b.common_name;
    return {
      flag: 'fail', score: 0,
      msg: `Dureza incompatible: ${soft} prefiere agua blanda (GH ${softA ? a.gh_min + '-' + a.gh_max : b.gh_min + '-' + b.gh_max}°dH) vs ${hard} agua dura (GH ${hardA ? a.gh_min + '-' + a.gh_max : b.gh_min + '-' + b.gh_max}°dH).`,
    };
  }
  if (overlap < 3) return {
    flag: 'narrow', score: 0.4,
    msg: `Dureza compartida estrecha (GH ${Math.max(a.gh_min, b.gh_min)}-${Math.min(a.gh_max, b.gh_max)}°dH). Usar agua con dureza en ese rango.`,
  };
  return { flag: 'ok', score: overlapScore(a.gh_min, a.gh_max, b.gh_min, b.gh_max) };
}

function evalWater(a: Fish, b: Fish): { flag: 'ok' | 'fail'; score: number; msg?: string } {
  if (a.water_type === b.water_type) return { flag: 'ok', score: 1 };
  return {
    flag: 'fail', score: 0,
    msg: `Tipos de agua incompatibles: ${a.common_name} (${a.water_type}) vs ${b.common_name} (${b.water_type}).`,
  };
}

function evalSize(a: Fish, b: Fish): { flag: 'ok' | 'caution' | 'fail'; score: number; msg?: string } {
  const sizeA = Math.max(a.adult_size_cm || 1, 1);
  const sizeB = Math.max(b.adult_size_cm || 1, 1);
  const ratio = Math.max(sizeA, sizeB) / Math.min(sizeA, sizeB);
  if (ratio >= 4) {
    const bigger  = a.adult_size_cm > b.adult_size_cm ? a : b;
    const smaller = a.adult_size_cm < b.adult_size_cm ? a : b;
    return {
      flag: 'fail', score: 0,
      msg: `${bigger.common_name} (${bigger.adult_size_cm}cm) puede comerse a ${smaller.common_name} (${smaller.adult_size_cm}cm).`,
    };
  }
  if (ratio >= 2.5) return {
    flag: 'caution', score: 0.5,
    msg: 'Diferencia de tamaño notable. Supervisar comportamiento durante la adaptación.',
  };
  return { flag: 'ok', score: 1 };
}

function evalAggr(a: Fish, b: Fish): { flag: 'ok' | 'caution' | 'fail'; score: number; msg?: string } {
  const max = Math.max(a.aggression, b.aggression);
  const aggressor = a.aggression > b.aggression ? a : b;
  if (max === 5) return {
    flag: 'fail', score: 0,
    msg: `${aggressor.common_name} tiene agresividad máxima (5/5). Solo compatible consigo mismo.`,
  };
  if (max === 4) return {
    flag: 'caution', score: 0.5,
    msg: `${aggressor.common_name} tiene agresividad alta (4/5). Proporcionar espacio y escondites.`,
  };
  if (max === 3 && Math.min(a.aggression, b.aggression) <= 1) return {
    flag: 'caution', score: 0.7,
    msg: `${aggressor.common_name} puede intimidar a peces muy pacíficos. Vigilar comportamiento.`,
  };
  return { flag: 'ok', score: 1 };
}

// ── Expert compatibility (compatible_with / avoid_with) ───────────────────────
type ExpertFlag = 'fail' | 'bonus' | 'neutral';

function evalExpertCompat(a: Fish, b: Fish): { flag: ExpertFlag; score: number; msg?: string } {
  const bInAAvoid = a.avoid_with?.includes(b.scientific_name) ?? false;
  const aInBAvoid = b.avoid_with?.includes(a.scientific_name) ?? false;
  if (bInAAvoid || aInBAvoid) {
    return {
      flag: 'fail',
      score: 0,
      msg: `⚠️ ${a.common_name} y ${b.common_name} deben evitarse: combinación desaconsejada por expertos.`,
    };
  }

  const bInACompat = a.compatible_with?.includes(b.scientific_name) ?? false;
  const aInBCompat = b.compatible_with?.includes(a.scientific_name) ?? false;
  if (bInACompat || aInBCompat) {
    return {
      flag: 'bonus',
      score: 1.2,
      msg: '✅ Compañeros recomendados por expertos',
    };
  }

  return { flag: 'neutral', score: 1 };
}

// ── Main export ───────────────────────────────────────────────────────────────
export function checkCompatibility(fishA: Fish, fishB: Fish): CompatibilityCheck {
  // 1. Hard-coded pair rule
  const pair = findPairRule(fishA, fishB);
  if (pair) {
    return {
      fish_a: fishA, fish_b: fishB,
      result: pair.result,
      reasons: [pair.reason],
      paramScore: pair.result === 'compatible' ? 85 : pair.result === 'caution' ? 55 : 20,
      params: { temp: 'ok', ph: 'ok', gh: 'ok', water: 'ok', size: 'ok', aggr: pair.result === 'incompatible' ? 'fail' : 'caution' },
    };
  }

  const temp   = evalTemp(fishA, fishB);
  const ph     = evalPh(fishA, fishB);
  const gh     = evalGh(fishA, fishB);
  const water  = evalWater(fishA, fishB);
  const size   = evalSize(fishA, fishB);
  const aggr   = evalAggr(fishA, fishB);
  const expert = evalExpertCompat(fishA, fishB);

  const reasons: string[] = [];
  let result: CompatibilityResult = 'compatible';

  // Collect fail/narrow messages (water checked first — instant fail)
  if (water.flag === 'fail') {
    result = 'incompatible';
    if (water.msg) reasons.push(water.msg);
  }
  if (temp.flag === 'fail')  { result = 'incompatible'; if (temp.msg) reasons.push(temp.msg); }
  if (ph.flag   === 'fail')  { result = 'incompatible'; if (ph.msg)   reasons.push(ph.msg);   }
  if (gh.flag   === 'fail')  { result = 'incompatible'; if (gh.msg)   reasons.push(gh.msg);   }
  if (size.flag === 'fail')  { result = 'incompatible'; if (size.msg) reasons.push(size.msg); }
  if (aggr.flag === 'fail')  { result = 'incompatible'; if (aggr.msg) reasons.push(aggr.msg); }

  // Caution if still compatible
  if (result === 'compatible') {
    if (temp.flag === 'narrow') { result = 'caution'; if (temp.msg) reasons.push(temp.msg); }
    if (ph.flag   === 'narrow') { result = 'caution'; if (ph.msg)   reasons.push(ph.msg);   }
    if (gh.flag   === 'narrow') { result = 'caution'; if (gh.msg)   reasons.push(gh.msg);   }
    if (size.flag === 'caution'){ result = 'caution'; if (size.msg) reasons.push(size.msg); }
    if (aggr.flag === 'caution'){ result = 'caution'; if (aggr.msg) reasons.push(aggr.msg); }
  } else {
    // Still show caution context even if already incompatible
    if (temp.flag === 'narrow' && temp.msg) reasons.push(temp.msg);
    if (ph.flag   === 'narrow' && ph.msg)   reasons.push(ph.msg);
    if (gh.flag   === 'narrow' && gh.msg)   reasons.push(gh.msg);
  }

  // ── Expert compatibility adjustments ────────────────────────────────────────
  if (expert.flag === 'fail') {
    if (result === 'compatible') {
      result = 'caution';
    } else if (result === 'caution') {
      result = 'incompatible';
    }
    if (expert.msg) reasons.push(expert.msg);
  } else if (expert.flag === 'bonus' && expert.msg) {
    reasons.push(expert.msg);
  }

  if (reasons.length === 0) {
    reasons.push('Temperatura, pH, dureza y temperamento compatibles. Buena combinación.');
  }

  // ── paramScore 0-100 ──────────────────────────────────────────────────────
  // Weighted average: temp 30%, ph 25%, gh 20%, size 15%, aggr 10%
  const raw =
    temp.score  * 0.30 +
    ph.score    * 0.25 +
    gh.score    * 0.20 +
    size.score  * 0.15 +
    aggr.score  * 0.10;
  // Water incompatibility floors everything
  let paramScore = water.flag === 'fail' ? 0 : Math.round(raw * 100);

  // Apply expert bonus/penalty to paramScore
  if (expert.flag === 'bonus')  paramScore = Math.min(100, paramScore + 10);
  if (expert.flag === 'fail')   paramScore = Math.max(0,   paramScore - 15);

  return {
    fish_a: fishA, fish_b: fishB,
    result, reasons, paramScore,
    params: {
      temp:  temp.flag,
      ph:    ph.flag,
      gh:    gh.flag,
      water: water.flag,
      size:  size.flag,
      aggr:  aggr.flag,
    },
  };
}

export function checkAquariumCompatibility(fishList: Fish[]): {
  hasIssues: boolean;
  checks:    CompatibilityCheck[];
  worstScore: number;
} {
  const checks: CompatibilityCheck[] = [];

  for (let i = 0; i < fishList.length; i++) {
    for (let j = i + 1; j < fishList.length; j++) {
      checks.push(checkCompatibility(fishList[i], fishList[j]));
    }
  }

  const hasIssues  = checks.some(c => c.result !== 'compatible');
  const worstScore = checks.length > 0 ? Math.min(...checks.map(c => c.paramScore)) : 100;
  return { hasIssues, checks, worstScore };
}

// ── Expert recommendations ────────────────────────────────────────────────────
export function getExpertRecommendations(
  fish: Fish,
  allFish: Fish[],
): { ideal: Fish[]; avoid: Fish[] } {
  const ideal = allFish.filter(f => fish.compatible_with?.includes(f.scientific_name) ?? false);
  const avoid = allFish.filter(f => fish.avoid_with?.includes(f.scientific_name) ?? false);
  return { ideal, avoid };
}

// ── Breeding checklist (unchanged) ───────────────────────────────────────────
export function getBreedingChecklist(fish: Fish): {
  label: string; description: string;
  category: 'water' | 'tank' | 'feeding' | 'behavior' | 'care';
}[] {
  const checklist: { label: string; description: string; category: 'water' | 'tank' | 'feeding' | 'behavior' | 'care' }[] = [
    {
      label: `Temperatura: ${fish.temp_min + 1}-${fish.temp_max}°C`,
      description: `Elevar temperatura al rango alto de la especie para estimular cría.`,
      category: 'water',
    },
    {
      label: `pH: ${fish.ph_min}-${fish.ph_max}`,
      description: `Mantener pH estable. Cambios de agua parciales graduales.`,
      category: 'water',
    },
    {
      label: `GH: ${fish.gh_min}-${fish.gh_max}°dH`,
      description: `Ajustar dureza del agua al rango de la especie usando osmosis/minerales.`,
      category: 'water',
    },
    {
      label: `Tanque de cría mínimo ${Math.max(40, Math.round(fish.min_tank_liters * 0.5))}L`,
      description: `Usar tanque separado para la puesta, limpio y sin decoración agresiva.`,
      category: 'tank',
    },
    {
      label: 'Alimentación viva o congelada',
      description: 'Enriquecer dieta con artemia viva, gusanos de sangre o dapnia 2 semanas antes.',
      category: 'feeding',
    },
    {
      label: 'Identificar pareja (macho y hembra)',
      description: 'Asegurarse de tener al menos un macho y una hembra maduros sexualmente.',
      category: 'behavior',
    },
    {
      label: 'Filtración suave',
      description: 'Usar filtro de esponja para no aspirar huevos ni alevines.',
      category: 'tank',
    },
  ];

  if (fish.is_schooling) {
    checklist.push({
      label: `Cardumen de al menos ${fish.schooling_min ?? 6} individuos`,
      description: 'Esta especie necesita grupo para reducir el estrés y favorecer la reproducción.',
      category: 'behavior',
    });
  }

  if (fish.water_type === 'saltwater') {
    checklist.push({
      label: 'Salinidad 1.020-1.025 SG',
      description: 'Mantener densidad específica estable con osmosis inversa + sal marina.',
      category: 'water',
    });
  }

  checklist.push({
    label: 'Separar alevines de adultos',
    description: 'Una vez eclosionados, separar los alevines para evitar que sean comidos.',
    category: 'care',
  });

  return checklist;
}
