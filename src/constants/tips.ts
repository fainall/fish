export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Tip {
  id: string;
  title: string;
  body: string;
  icon: string;
  level: ExperienceLevel[];
  category: 'cycling' | 'water' | 'feeding' | 'compatibility' | 'breeding' | 'general';
}

export const TIPS: Tip[] = [
  // Principiante - Ciclado
  {
    id: 'cycling-1',
    title: '¿Qué es el ciclado?',
    body: 'El ciclado es el proceso donde bacterias beneficiosas colonizan tu filtro. Sin él, el amoniaco de los peces los envenenará. Dura 4-6 semanas y es el paso más importante antes de poner peces.',
    icon: '🔄',
    level: ['beginner'],
    category: 'cycling',
  },
  {
    id: 'cycling-2',
    title: 'Cómo saber si tu acuario está ciclado',
    body: 'Mide amoniaco y nitrito: deben estar en 0 ppm. Si el nitrato sube pero amoniaco y nitrito están en 0, ¡felicidades! Tu acuario está listo para recibir peces.',
    icon: '🧪',
    level: ['beginner'],
    category: 'cycling',
  },
  {
    id: 'cycling-3',
    title: 'Acelera el ciclado',
    body: 'Puedes acelerar el ciclado añadiendo bacterias en botella (Bio-Spira, Seachem Stability), material filtrante de un acuario ya establecido, o plantas vivas.',
    icon: '⚡',
    level: ['beginner'],
    category: 'cycling',
  },
  // Principiante - General
  {
    id: 'beginner-1',
    title: 'La regla del 20-30%',
    body: 'Cambia el 20-30% del agua cada semana. Nunca cambies el 100% — destruirías las bacterias beneficiosas del filtro.',
    icon: '💧',
    level: ['beginner'],
    category: 'water',
  },
  {
    id: 'beginner-2',
    title: 'No sobrealimentes',
    body: 'Solo da la cantidad de comida que tus peces consuman en 2-3 minutos, 1-2 veces al día. El exceso se pudre y contamina el agua.',
    icon: '🍽️',
    level: ['beginner'],
    category: 'feeding',
  },
  {
    id: 'beginner-3',
    title: 'Cuarentena siempre',
    body: 'Antes de añadir peces nuevos al acuario principal, ponlos 2 semanas en un tanque de cuarentena. Evita que traigan enfermedades.',
    icon: '🏥',
    level: ['beginner'],
    category: 'general',
  },
  {
    id: 'beginner-4',
    title: 'Empieza con peces resistentes',
    body: 'Para tu primer acuario: Guppies, Platies, Peces Cebra o Corydoras. Son resistentes a variaciones de agua y fáciles de cuidar.',
    icon: '🐠',
    level: ['beginner'],
    category: 'compatibility',
  },
  {
    id: 'beginner-5',
    title: 'El filtro es vital',
    body: 'Nunca laves el material filtrante con agua de la llave — el cloro mata las bacterias. Usa siempre agua del propio acuario para limpiar el filtro.',
    icon: '⚙️',
    level: ['beginner'],
    category: 'water',
  },
  // Intermedio
  {
    id: 'inter-1',
    title: 'KH: el estabilizador de pH',
    body: 'El KH (carbonato de dureza) evita que el pH baje bruscamente. Un KH bajo (< 3 dKH) hace que el pH fluctúe peligrosamente. Mantén al menos 4-6 dKH.',
    icon: '🛡️',
    level: ['intermediate'],
    category: 'water',
  },
  {
    id: 'inter-2',
    title: 'Alimentación viva para la cría',
    body: 'Para inducir la reproducción, enriquece la dieta 2 semanas antes con artemia viva, dafnia o gusanos de sangre. Activa el instinto reproductivo.',
    icon: '🦐',
    level: ['intermediate', 'advanced'],
    category: 'breeding',
  },
  {
    id: 'inter-3',
    title: 'Nitrato: el enemigo silencioso',
    body: 'El nitrato no mata rápido pero debilita a los peces con el tiempo. Mantenlo bajo 40 ppm con cambios de agua frecuentes y plantas que lo consuman.',
    icon: '⚠️',
    level: ['intermediate'],
    category: 'water',
  },
  {
    id: 'inter-4',
    title: 'Densidad de peces',
    body: 'Regla general: 1 cm de pez adulto por litro de agua. Pero considera también el comportamiento — un Oscar de 30cm agresivo no convive bien aunque el cálculo "cuadre".',
    icon: '📏',
    level: ['intermediate'],
    category: 'compatibility',
  },
  // Avanzado
  {
    id: 'adv-1',
    title: 'CO2 para plantas exigentes',
    body: 'Un sistema de CO2 presurizado con difusor y drop checker te permite mantener 20-30 ppm de CO2 para plantas de alta demanda. Ajústalo con el fotoperiodo.',
    icon: '🌿',
    level: ['advanced'],
    category: 'general',
  },
  {
    id: 'adv-2',
    title: 'Osmosis inversa para marinos',
    body: 'Para acuarios marinos y peces muy sensibles, el agua de osmosis inversa (0 TDS) con mineralización controlada es indispensable para reproducción exitosa.',
    icon: '🌊',
    level: ['advanced'],
    category: 'water',
  },
  {
    id: 'adv-3',
    title: 'Fotoperiodo y reproducción',
    body: 'Simular estaciones con el fotoperiodo (12h verano, 10h invierno) puede inducir la reproducción en muchas especies estacionales como los Apistogrammas.',
    icon: '☀️',
    level: ['advanced'],
    category: 'breeding',
  },
];

export const CYCLING_EXPLANATION = {
  title: '¿Qué es el ciclado del acuario?',
  steps: [
    { emoji: '🐟', text: 'Los peces producen amoniaco (NH3) con sus desechos. En altas concentraciones es mortal.' },
    { emoji: '🦠', text: 'Bacterias Nitrosomonas colonizan el filtro y convierten el amoniaco en nitrito (NO2), también tóxico.' },
    { emoji: '🔄', text: 'Bacterias Nitrospira transforman el nitrito en nitrato (NO3), mucho menos dañino.' },
    { emoji: '💧', text: 'Los cambios de agua periódicos eliminan el nitrato. El ciclo completo tarda 4-6 semanas.' },
  ],
  conclusion: 'Sin este ciclo establecido, los peces mueren en días. Es lo primero que debes hacer antes de comprar peces.',
};

// ─── Extended tips (added bulk) ──────────────────────────────────────────
const EXTRA_TIPS: Tip[] = [
  // ── PRINCIPIANTE ───────────────────────────────────────────────────────
  { id: 'beg-water-change', title: '🚰 Cambios de agua semanales',
    body: 'Cambia 20-25% del agua una vez por semana. Usa acondicionador para neutralizar el cloro del grifo y evita cambios de temperatura mayores a 2°C.',
    icon: '💧', level: ['beginner'], category: 'water' },
  { id: 'beg-feeding-rule', title: '🍽 Regla de los 2 minutos',
    body: 'Da solo lo que tus peces puedan comer en 2 minutos. Si sobra comida, contamina el agua. Mejor poco y dos veces al día que mucho una vez.',
    icon: '🐟', level: ['beginner'], category: 'feeding' },
  { id: 'beg-quarantine', title: '🩺 Cuarentena',
    body: 'Antes de meter peces nuevos en tu acuario principal, mantenlos 2-3 semanas en un tanque hospital. Previene introducir enfermedades como Ich o velo.',
    icon: '⚠️', level: ['beginner', 'intermediate'], category: 'general' },
  { id: 'beg-test-kit', title: '🧪 Kit de test básico',
    body: 'Mide al menos NH3 (amoniaco), NO2 (nitrito), NO3 (nitrato), pH y GH. Las tiras son rápidas pero las gotas son más precisas.',
    icon: '📊', level: ['beginner'], category: 'water' },
  { id: 'beg-substrate', title: '🪨 Sustrato',
    body: 'Para principiantes: arena fina o grava pequeña 2-3mm. Evita piedras grandes (atrapan suciedad) o sustratos especializados sin investigar antes.',
    icon: '🌍', level: ['beginner'], category: 'general' },
  { id: 'beg-compatibility', title: '🤝 Compatibilidad básica',
    body: 'No mezcles peces tropicales con agua fría. Verifica rangos de pH y temperatura compatibles. Usa la herramienta "Compatibilidad" del catálogo.',
    icon: '🐠', level: ['beginner'], category: 'compatibility' },
  { id: 'beg-dechlorinator', title: '🛡 Acondicionador de agua',
    body: 'Productos como Seachem Prime o API Stress Coat neutralizan cloro y cloraminas. 1 tapón cada 40-50L de agua nueva.',
    icon: '💉', level: ['beginner'], category: 'water' },
  { id: 'beg-school-size', title: '🐟 Cardumen mínimo',
    body: 'Peces de cardumen (tetras, rasboras, danios) necesitan al menos 6 individuos. Solos se estresan, se enferman y se vuelven agresivos.',
    icon: '👥', level: ['beginner'], category: 'compatibility' },
  { id: 'beg-plants-easy', title: '🌱 Plantas fáciles',
    body: 'Empieza con Anubias, Java Fern, Cryptocoryne wendtii, Vallisneria. No requieren CO2 ni iluminación intensa. Sobreviven y oxigenan el agua.',
    icon: '🌿', level: ['beginner'], category: 'general' },
  { id: 'beg-thermometer', title: '🌡 Termómetro siempre visible',
    body: 'Coloca un termómetro digital o de adhesivo en un lugar visible. Verifica diariamente — un calentador roto puede hervir o enfriar tus peces de noche.',
    icon: '🌡', level: ['beginner'], category: 'water' },

  // ── INTERMEDIO ─────────────────────────────────────────────────────────
  { id: 'int-co2-liquid', title: '🌿 CO2 líquido para low-tech',
    body: 'Easy Carbo o Excel pueden ayudar a plantas de demanda media sin tener que instalar un sistema presurizado. Cuidado con peces sensibles como los camarones.',
    icon: '💧', level: ['intermediate'], category: 'general' },
  { id: 'int-bioload', title: '⚖️ Bioload y filtración',
    body: 'Tu filtro debería procesar 4-6 veces el volumen del tanque por hora. Para peces grandes (cíclidos), apunta a 8-10x con filtro externo.',
    icon: '🔄', level: ['intermediate', 'advanced'], category: 'water' },
  { id: 'int-aquascape', title: '🎨 Regla de tercios en aquascaping',
    body: 'Divide el tanque visualmente en 3 partes horizontales y verticales. Coloca el punto focal (roca, planta destacada) en una intersección.',
    icon: '🖼', level: ['intermediate'], category: 'general' },
  { id: 'int-blackwater', title: '🍂 Blackwater bioactivo',
    body: 'Hojas de Catappa, alder cones y madera liberan taninos. Bajan pH naturalmente y tienen propiedades antibacterianas. Ideal para Bettas y Tetras.',
    icon: '🍃', level: ['intermediate'], category: 'water' },
  { id: 'int-feeding-variety', title: '🍤 Variedad alimenticia',
    body: 'Rota entre escamas, pellets, congelados (artemia, daphnia, mysis), y vegetales (espinaca, calabacín). Previene deficiencias y aumenta colorido.',
    icon: '🥬', level: ['intermediate'], category: 'feeding' },
  { id: 'int-fasting-day', title: '🚫 Día de ayuno',
    body: 'Ayuna a tus peces 1 día por semana. Limpia su sistema digestivo, reduce desechos y previene problemas como sobrealimentación e hinchazón.',
    icon: '⏰', level: ['intermediate'], category: 'feeding' },
  { id: 'int-ph-buffer', title: '🧪 Estabilizar pH',
    body: 'pH oscilante estresa más que un pH "incorrecto" estable. Usa madera/turba (acidifica) o conchas/coral (alcaliniza) en vez de químicos súbitos.',
    icon: '⚗️', level: ['intermediate'], category: 'water' },

  // ── AVANZADO ───────────────────────────────────────────────────────────
  { id: 'adv-ei-method', title: '🌿 Método EI (Estimative Index)',
    body: 'Tom Barr propone dosificar macros (NPK) en exceso 3x/semana + 50% cambio agua semanal. Funciona para tanques con CO2 inyectado y luz alta.',
    icon: '🧮', level: ['advanced'], category: 'general' },
  { id: 'adv-drip-acclimation', title: '💧 Aclimatación por goteo',
    body: 'Para invertebrados, peces sensibles o cambios de tienda: 2-4 gotas por segundo durante 1-2h. Iguala parámetros sin shock osmótico.',
    icon: '🪣', level: ['advanced'], category: 'general' },
  { id: 'adv-cycle-fishless', title: '🔬 Ciclado sin peces',
    body: 'Adicción de amoniaco puro (4 ppm) o gambas crudas. Mide diariamente; cuando NH3 y NO2 caen a 0 en 24h y NO3 sube, está ciclado (~4-6 semanas).',
    icon: '🧬', level: ['advanced'], category: 'cycling' },
  { id: 'adv-breeding-trigger', title: '🥚 Triggers de reproducción',
    body: 'Bajadas de temperatura simulando lluvias, ayunos seguidos de comida proteica, cambios grandes de agua... cada especie tiene su propio trigger.',
    icon: '🌧', level: ['advanced'], category: 'breeding' },
  { id: 'adv-rodi', title: '🌊 RO/DI para precisión',
    body: 'Agua de osmosis inversa + deionización (0 TDS) permite remineralizar exactamente. Esencial para Discos, Apistogrammas, camarones cristal y marinos.',
    icon: '💎', level: ['advanced'], category: 'water' },
  { id: 'adv-uv-sterilizer', title: '🔆 Esterilizador UV',
    body: 'Una lámpara UV-C en línea elimina algas en suspensión y patógenos. No mata bacterias del filtro. Útil contra agua verde persistente.',
    icon: '☀️', level: ['advanced'], category: 'water' },
  { id: 'adv-biofilter-media', title: '🧱 Medios filtrantes ranking',
    body: 'Mecánico (esponja gruesa) → biológico (cerámica, matrix, biohome) → químico (carbón solo en emergencias). Nunca cambies todos a la vez.',
    icon: '🔧', level: ['advanced'], category: 'general' },
  { id: 'adv-genetics', title: '🧬 Genética en cría',
    body: 'Para evitar consanguinidad: introduce sangre nueva cada 2-3 generaciones. Lleva un registro de líneas. Importante en Discos, Bettas y Apistogrammas.',
    icon: '📋', level: ['advanced'], category: 'breeding' },
  { id: 'adv-iwagumi', title: '🪨 Iwagumi style',
    body: 'Aquascape minimalista japonés con piedras (3, 5 o 7). Una piedra principal (Oyaishi), dos secundarias (Fukuishi), y opcional acentos (Soeishi).',
    icon: '🗻', level: ['advanced'], category: 'general' },
  { id: 'adv-deep-sand', title: '🏜 Deep Sand Bed (DSB)',
    body: 'Capa de arena fina de 7-10cm crea zonas anaeróbicas donde bacterias desnitrificantes reducen NO3 a N2. Útil en marinos y biotopos amazónicos.',
    icon: '🏖', level: ['advanced'], category: 'water' },
];
TIPS.push(...EXTRA_TIPS);

export function getTipsForLevel(level: ExperienceLevel): Tip[] {
  return TIPS.filter(t => t.level.includes(level));
}

export function getDailyTip(level: ExperienceLevel): Tip {
  const tips = getTipsForLevel(level);
  const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return tips[dayOfYear % tips.length];
}
