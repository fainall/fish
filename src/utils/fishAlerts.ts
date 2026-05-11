import { Fish, ParameterRecord } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FishAlert {
  type: 'critical' | 'warning' | 'info' | 'success';
  icon: string;
  title: string;
  body: string;
  fishName?: string;
}

// ─── 1. Parameter alerts ──────────────────────────────────────────────────────

export function getParameterAlerts(
  fish: Fish[],
  latestRecord: ParameterRecord | null,
): FishAlert[] {
  const alerts: FishAlert[] = [];

  if (!latestRecord) return alerts;

  const { temperature, ph, gh, ammonia, nitrite, nitrate } = latestRecord;

  // ── Global chemistry alerts (affect all fish) ──
  if (ammonia !== undefined && ammonia > 0.5) {
    alerts.push({
      type: 'critical',
      icon: '☠️',
      title: 'Amoníaco peligroso',
      body: `Nivel de amoníaco: ${ammonia} ppm. Valores >0.5 ppm son letales para todos los peces. Realiza un cambio de agua de inmediato.`,
    });
  }

  if (nitrite !== undefined && nitrite > 1.0) {
    alerts.push({
      type: 'critical',
      icon: '⚠️',
      title: 'Nitrito elevado',
      body: `Nivel de nitrito: ${nitrite} ppm. Valores >1.0 ppm son tóxicos. Verifica el ciclo del nitrógeno y haz un cambio de agua.`,
    });
  }

  if (nitrate !== undefined && nitrate > 50) {
    alerts.push({
      type: 'warning',
      icon: '🟡',
      title: 'Nitrato alto',
      body: `Nivel de nitrato: ${nitrate} ppm. Valores >50 ppm estresan a los peces. Aumenta la frecuencia de cambios de agua.`,
    });
  }

  // ── Per-fish range checks ──
  for (const f of fish) {
    const name = f.common_name;

    if (temperature !== undefined) {
      if (temperature < f.temp_min || temperature > f.temp_max) {
        alerts.push({
          type: 'critical',
          icon: '🌡️',
          title: `Temperatura fuera de rango para ${name}`,
          body: `${name} necesita ${f.temp_min}–${f.temp_max} °C, temperatura actual: ${temperature} °C.`,
          fishName: name,
        });
      }
    }

    if (ph !== undefined) {
      if (ph < f.ph_min || ph > f.ph_max) {
        alerts.push({
          type: 'critical',
          icon: '⚠️',
          title: `pH fuera de rango para ${name}`,
          body: `${name} necesita pH ${f.ph_min}–${f.ph_max}, pH actual: ${ph}.`,
          fishName: name,
        });
      }
    }

    if (gh !== undefined) {
      if (gh < f.gh_min || gh > f.gh_max) {
        alerts.push({
          type: 'warning',
          icon: '💧',
          title: `Dureza fuera de rango para ${name}`,
          body: `${name} necesita GH ${f.gh_min}–${f.gh_max} °dH, GH actual: ${gh} °dH.`,
          fishName: name,
        });
      }
    }
  }

  return alerts;
}

// ─── 2. Schooling alerts ──────────────────────────────────────────────────────

export function getSchoolingAlerts(
  fish: { fishData: Fish; qty: number }[],
): FishAlert[] {
  const alerts: FishAlert[] = [];

  for (const { fishData, qty } of fish) {
    if (!fishData.is_schooling) continue;

    const minSchool = fishData.schooling_min ?? 6;

    if (qty < minSchool) {
      alerts.push({
        type: 'warning',
        icon: '🐟',
        title: `Cardumen incompleto: ${fishData.common_name}`,
        body: `Tu ${fishData.common_name} necesita mínimo ${minSchool} compañeros, tienes ${qty}. Los peces de cardumen solos se estresan.`,
        fishName: fishData.common_name,
      });
    }
  }

  return alerts;
}

// ─── 3. Difficulty alerts ─────────────────────────────────────────────────────

export function getDifficultyAlerts(
  fish: Fish[],
  userExperience: 'beginner' | 'intermediate' | 'advanced',
): FishAlert[] {
  const alerts: FishAlert[] = [];

  for (const f of fish) {
    const difficulty = f.difficulty;
    if (!difficulty) continue;

    if (
      userExperience === 'beginner' &&
      (difficulty === 'advanced' || difficulty === 'expert')
    ) {
      alerts.push({
        type: 'warning',
        icon: '📚',
        title: `Pez desafiante: ${f.common_name}`,
        body: `${f.common_name} está catalogado como "${difficultyLabel(difficulty)}" y puede ser difícil para principiantes. Investiga sus necesidades a fondo.`,
        fishName: f.common_name,
      });
    } else if (userExperience === 'intermediate' && difficulty === 'expert') {
      alerts.push({
        type: 'warning',
        icon: '📚',
        title: `Pez experto: ${f.common_name}`,
        body: `${f.common_name} está catalogado como "experto". Asegúrate de conocer sus requerimientos específicos antes de mantenerlo.`,
        fishName: f.common_name,
      });
    }
  }

  return alerts;
}

function difficultyLabel(level: string): string {
  const labels: Record<string, string> = {
    beginner: 'principiante',
    intermediate: 'intermedio',
    advanced: 'avanzado',
    expert: 'experto',
  };
  return labels[level] ?? level;
}

// ─── 4. Health tips ───────────────────────────────────────────────────────────

export function getHealthTips(fish: Fish[]): FishAlert[] {
  const alerts: FishAlert[] = [];

  const fishWithDiseases = fish.filter(
    (f) => f.common_diseases && f.common_diseases.length > 0,
  );

  if (fishWithDiseases.length === 0) return alerts;

  // Pick up to 2 deterministically (by index, seeded on day)
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const picks = pickN(fishWithDiseases, 2, dayIndex);

  for (const f of picks) {
    const diseases = f.common_diseases!;
    const diseaseList = diseases.slice(0, 2).join(', ');

    alerts.push({
      type: 'info',
      icon: '🩺',
      title: `Salud de ${f.common_name}`,
      body: `Tu ${f.common_name} es propenso a: ${diseaseList}. Mantén una excelente calidad del agua y realiza observaciones diarias.`,
      fishName: f.common_name,
    });
  }

  return alerts;
}

// ─── 5. Setup recommendations ─────────────────────────────────────────────────

export function getSetupRecommendations(fish: Fish[]): FishAlert[] {
  const alerts: FishAlert[] = [];

  if (fish.length === 0) return alerts;

  // Hiding spots
  const needHiding = fish.filter((f) => f.needs_hiding).length;
  if (needHiding >= 3) {
    alerts.push({
      type: 'info',
      icon: '🪨',
      title: 'Escondites recomendados',
      body: `${needHiding} de tus peces necesitan escondites. Añade cuevas, rocas o plantas densas para reducir el estrés.`,
    });
  } else if (needHiding > 0 && needHiding < 3) {
    alerts.push({
      type: 'info',
      icon: '🪨',
      title: 'Escondites recomendados',
      body: `${needHiding} de tus peces se benefician de tener escondites en el acuario.`,
    });
  }

  // Driftwood
  const needDriftwood = fish.filter((f) => f.needs_driftwood).length;
  if (needDriftwood > 0) {
    alerts.push({
      type: 'info',
      icon: '🪵',
      title: 'Madera flotante necesaria',
      body: `${needDriftwood} ${needDriftwood === 1 ? 'pez necesita' : 'peces necesitan'} madera flotante (troncos) en el acuario, ya sea para alimentarse de ella o para sentirse seguros.`,
    });
  }

  // Flow preference conflicts
  const flows = fish
    .map((f) => f.flow_preference)
    .filter((fp): fp is NonNullable<typeof fp> => fp !== undefined);

  if (flows.length >= 2) {
    const hasStill = flows.some((fp) => fp === 'still');
    const hasStrong = flows.some((fp) => fp === 'strong');

    if (hasStill && hasStrong) {
      alerts.push({
        type: 'warning',
        icon: '🌊',
        title: 'Conflicto de flujo de agua',
        body: 'Tienes peces que prefieren agua tranquila junto con peces que necesitan corriente fuerte. Considera zonas diferenciadas en el acuario.',
      });
    } else if (hasStill) {
      const stillFish = fish
        .filter((f) => f.flow_preference === 'still')
        .map((f) => f.common_name)
        .join(', ');
      alerts.push({
        type: 'info',
        icon: '🌊',
        title: 'Preferencia de flujo bajo',
        body: `${stillFish} prefiere agua tranquila. Asegúrate de que la filtración no genere corrientes fuertes.`,
      });
    }
  }

  // Light conflicts
  const lights = fish
    .map((f) => f.light_preference)
    .filter((lp): lp is NonNullable<typeof lp> => lp !== undefined);

  if (lights.length >= 2) {
    const hasDim = lights.some((lp) => lp === 'dim');
    const hasBright = lights.some((lp) => lp === 'bright');

    if (hasDim && hasBright) {
      alerts.push({
        type: 'warning',
        icon: '💡',
        title: 'Conflicto de iluminación',
        body: 'Algunos peces prefieren poca luz y otros luz intensa. Añade plantas flotantes o zonas sombreadas para satisfacer a todos.',
      });
    }
  }

  return alerts;
}

// ─── 6. Fish of the day ───────────────────────────────────────────────────────

export function getFishOfTheDay(
  fish: Fish[],
): { fish: Fish; fact: string } | null {
  if (fish.length === 0) return null;

  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const chosen = fish[dayIndex % fish.length];

  const fact = buildFact(chosen);

  return { fish: chosen, fact };
}

function buildFact(f: Fish): string {
  const facts: string[] = [];

  if (f.lifespan_years) {
    facts.push(`Vive hasta ${f.lifespan_years} años en condiciones óptimas.`);
  }

  if (f.origin) {
    facts.push(`Originario de ${f.origin}.`);
  }

  if (f.adult_size_cm) {
    facts.push(`Alcanza ${f.adult_size_cm} cm en su etapa adulta.`);
  }

  if (f.is_schooling && f.schooling_min) {
    facts.push(`Es un pez de cardumen; necesita al menos ${f.schooling_min} individuos para sentirse seguro.`);
  }

  if (f.diet) {
    facts.push(`Dieta: ${f.diet}.`);
  }

  if (f.habitat) {
    facts.push(`Hábitat natural: ${f.habitat}.`);
  }

  if (facts.length === 0) {
    return `${f.common_name} (${f.scientific_name}) — un pez fascinante para tu acuario.`;
  }

  // Return 1 or 2 facts depending on availability
  return facts.slice(0, 2).join(' ');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Pick n items from an array using a seed for determinism.
 * Items are selected by cycling the seed over the array.
 */
function pickN<T>(arr: T[], n: number, seed: number): T[] {
  if (arr.length === 0) return [];
  const count = Math.min(n, arr.length);
  const result: T[] = [];
  const used = new Set<number>();

  for (let i = 0; i < count; i++) {
    let idx = (seed + i * 7) % arr.length;
    // Avoid duplicates with a simple linear probe
    while (used.has(idx)) {
      idx = (idx + 1) % arr.length;
    }
    used.add(idx);
    result.push(arr[idx]);
  }

  return result;
}
