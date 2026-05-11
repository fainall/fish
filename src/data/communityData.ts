import { Post, PostComment } from '../types';

export const DEMO_POSTS: Post[] = [
  {
    id: 'p1',
    user_id: 'u2',
    user_name: 'Carlos Mendoza',
    content: '¡Mi acuario de 300L finalmente estabilizado después de 6 semanas de ciclado! Amoniaco 0, nitritos 0, nitratos 10ppm. Listo para los primeros peces. Empezaré con tetras cardinales 🐠',
    image_url: 'https://images.unsplash.com/photo-1544552866-d3ed42536cfd?w=600&q=80',
    tags: ['acuario', 'ciclado', 'freshwater', 'tetras'],
    likes: ['u1', 'u3', 'u4'],
    comments_count: 5,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'p2',
    user_id: 'u3',
    user_name: 'Laura Gómez',
    content: 'Pregunta para la comunidad: ¿Cuántos bettas macho pueden convivir en un acuario con separadores? Tengo un tanque de 120L dividido en 3 secciones iguales. ¿Funciona bien eso?',
    tags: ['betta', 'consulta', 'freshwater'],
    likes: ['u1', 'u5'],
    comments_count: 8,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'p3',
    user_id: 'u4',
    user_name: 'Diego Ruiz',
    content: 'Primer desove exitoso de mis Apistogramma cacatuoides ❤️ La hembra está cuidando alrededor de 40 huevos debajo de una roca. ¡No puedo creerlo! Tres meses de trabajo dieron frutos.',
    image_url: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=600&q=80',
    tags: ['puestas', 'cichlidos', 'apistogramma', 'logro'],
    likes: ['u1', 'u2', 'u3', 'u5', 'u6'],
    comments_count: 12,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'p4',
    user_id: 'u5',
    user_name: 'Ana Torres',
    content: 'Comparto mi setup plantado de bajo mantenimiento: 60L, substrate de arena negra + nutrientes, iluminación 8h/día, CO2 líquido. Sin ferts adicionales. Las plantas están increíbles.',
    image_url: 'https://images.unsplash.com/photo-1534361960057-19f4434a4d78?w=600&q=80',
    tags: ['planted', 'aquascape', 'freshwater', 'plantas'],
    likes: ['u1', 'u2', 'u4'],
    comments_count: 7,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'p5',
    user_id: 'u6',
    user_name: 'Roberto Vega',
    content: 'Alerta: tuve un pico de amoniaco inesperado (3 ppm) en un acuario establecido de 2 años. Resultado: sobrealimenté durante las vacaciones con alimentador automático. Perdí 3 corydoras. Tengan cuidado con las vacaciones.',
    tags: ['alerta', 'amoniaco', 'experiencia', 'cuidado'],
    likes: ['u1', 'u3'],
    comments_count: 15,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'p6',
    user_id: 'u7',
    user_name: 'Sofía Lima',
    content: 'Mi acuario marino de 200L cumple 1 año 🎉 Corales SPS, LPS y blando conviviendo. Peces: par de clownfish, tang amarillo, dottyback. El secreto: constancia en los parámetros y cambios de agua semanales.',
    image_url: 'https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=600&q=80',
    tags: ['marino', 'saltwater', 'corales', 'reef', 'logro'],
    likes: ['u1', 'u2', 'u3', 'u4', 'u5'],
    comments_count: 20,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'p7',
    user_id: 'u8',
    user_name: 'Marcos Herrera',
    content: '¿Alguien ha tenido problemas con algas negras (BBA) en plantas de anubias? Probé con H2O2 pero volvieron al mes. Mi CO2 está estable a 30ppm. pH 6.8. Temperatura 26°C. No entiendo qué falla.',
    tags: ['algas', 'BBA', 'consulta', 'planted'],
    likes: ['u2', 'u6'],
    comments_count: 9,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const DEMO_COMMENTS: Record<string, PostComment[]> = {
  p1: [
    { id: 'c1', post_id: 'p1', user_id: 'u1', user_name: 'Usuario Demo', content: '¡Felicitaciones! Los tetras cardinales son perfectos para empezar. Ponlos en grupo de mínimo 10.', created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString() },
    { id: 'c2', post_id: 'p1', user_id: 'u3', user_name: 'Laura Gómez', content: 'Que emoción! Espera a que los veas nadar en cardumen bajo buena iluminación 😍', created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
    { id: 'c3', post_id: 'p1', user_id: 'u5', user_name: 'Ana Torres', content: 'También te recomiendo corydoras para el fondo, son muy activos y limpian bien.', created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
    { id: 'c4', post_id: 'p1', user_id: 'u4', user_name: 'Diego Ruiz', content: '6 semanas es perfecto. ¿Qué método de ciclado usaste?', created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString() },
    { id: 'c5', post_id: 'p1', user_id: 'u2', user_name: 'Carlos Mendoza', content: '@Diego Ruiz con bacteria líquida Seachem Stability + dosificando amoniaco puro al 10%', created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
  ],
  p2: [
    { id: 'c6', post_id: 'p2', user_id: 'u1', user_name: 'Usuario Demo', content: 'Sí funciona bien con separadores sólidos que no permitan ver entre secciones. La clave es que no se vean entre sí.', created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
    { id: 'c7', post_id: 'p2', user_id: 'u4', user_name: 'Diego Ruiz', content: 'Lo probé con vidrio esmerilado. Funciona. Ojo con que el filtro no circule agua entre compartimentos.', created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
    { id: 'c8', post_id: 'p2', user_id: 'u6', user_name: 'Roberto Vega', content: '40L por betta está bien, aunque 60L sería ideal. ¿Qué sistema de filtración usas?', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  ],
  p3: [
    { id: 'c9', post_id: 'p3', user_id: 'u1', user_name: 'Usuario Demo', content: '¡Increíble! Los Apistogramma son padres ejemplares. ¿Ya separaste al macho?', created_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString() },
    { id: 'c10', post_id: 'p3', user_id: 'u2', user_name: 'Carlos Mendoza', content: 'Uno de los mejores momentos del acuarismo. ¡Disfrútalo!', created_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString() },
    { id: 'c11', post_id: 'p3', user_id: 'u5', user_name: 'Ana Torres', content: 'Ten nauplios de artemia listos para cuando eclosionen 🦐', created_at: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString() },
  ],
  p4: [
    { id: 'c12', post_id: 'p4', user_id: 'u1', user_name: 'Usuario Demo', content: '¿Qué plantas tienes? Se ve muy natural.', created_at: new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString() },
    { id: 'c13', post_id: 'p4', user_id: 'u3', user_name: 'Laura Gómez', content: 'Hermoso setup. ¿Qué marca de CO2 líquido usas?', created_at: new Date(Date.now() - 35 * 60 * 60 * 1000).toISOString() },
  ],
  p5: [
    { id: 'c14', post_id: 'p5', user_id: 'u1', user_name: 'Usuario Demo', content: 'Muy importante el aviso, gracias por compartir. Lo siento por los corys.', created_at: new Date(Date.now() - 60 * 60 * 60 * 1000).toISOString() },
    { id: 'c15', post_id: 'p5', user_id: 'u2', user_name: 'Carlos Mendoza', content: 'Yo uso alimentador en ciclo de 2 veces por día con porciones muy pequeñas. Nunca tuve problemas.', created_at: new Date(Date.now() - 55 * 60 * 60 * 1000).toISOString() },
  ],
  p6: [],
  p7: [
    { id: 'c16', post_id: 'p7', user_id: 'u1', user_name: 'Usuario Demo', content: 'BBA generalmente aparece por fluctuaciones de CO2 o luz inconsistente. ¿Tu temporizador de luz es estable?', created_at: new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString() },
    { id: 'c17', post_id: 'p7', user_id: 'u4', user_name: 'Diego Ruiz', content: 'Prueba con amano shrimps, son los mejores contra BBA. También revisar si hay desequilibrio de nutrientes.', created_at: new Date(Date.now() - 95 * 60 * 60 * 1000).toISOString() },
  ],
};

export const COMMUNITY_TAGS = [
  'todos', 'freshwater', 'saltwater', 'planted', 'cichlidos', 'betta',
  'puestas', 'consulta', 'acuario', 'algas', 'marino', 'logro', 'alerta',
];
