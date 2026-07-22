# 📦 Material para la ficha de Google Play — Aquaria

Todo listo para copiar/pegar en Play Console. Paquete: `com.aquaria.app`.

---

## 1. Datos básicos de la ficha

| Campo | Valor |
|---|---|
| **Nombre de la app** | `Aquaria` |
| **Categoría de la app** | Estilo de vida (alt.: Educación) |
| **Etiquetas** | acuario, peces, acuariofilia, mascotas |
| **Correo de contacto** | `soporte@severeynfish.cl` |
| **Sitio web** (opcional) | `https://severeynfish.cl` |
| **Política de privacidad** | `https://fainall.github.io/fish/privacy-policy.html` |

---

## 2. Título (máx. 30 caracteres)

```
Aquaria: Gestor de Acuarios
```
*(27 caracteres ✓)*

---

## 3. Descripción corta (máx. 80 caracteres)

```
Gestiona tus acuarios, controla los parámetros del agua y cuida a tus peces.
```
*(76 caracteres ✓)*

---

## 4. Descripción larga (máx. 4000 caracteres)

```
Aquaria es la app todo-en-uno para acuaristas: gestiona tus acuarios, controla la calidad del agua, lleva el registro de tus peces y conecta con una comunidad que ama lo mismo que tú. 🐠

Ya seas principiante con tu primer betta o un acuarista experto con varios estanques plantados, Aquaria te ayuda a mantener a tus peces sanos y tu acuario en su mejor momento.

🐟 GESTIONA TUS ACUARIOS
• Crea y administra múltiples acuarios (agua dulce, salada o salobre).
• Registra volumen, equipo, plantas y decoración.
• Foto-galería de cada acuario para ver su evolución.

💧 CONTROLA LOS PARÁMETROS DEL AGUA
• Registra pH, temperatura, GH, KH, amoníaco, nitritos y nitratos.
• Historial y gráficos para detectar problemas a tiempo.
• Guía del ciclado del acuario.

🐠 CATÁLOGO DE PECES Y PLANTAS
• Fichas detalladas de especies: parámetros ideales, tamaño, dieta, compatibilidad y cría.
• Registra qué peces tienes en cada acuario.
• Catálogo de plantas acuáticas.
• ¿Falta una especie? Sugiérela y nuestro equipo la revisa.

🤝 COMPATIBILIDAD Y CALCULADORAS
• Comprueba si tus peces son compatibles entre sí.
• Calculadora de volumen efectivo y capacidad de población (stocking).

🥚 SEGUIMIENTO DE CRÍA
• Define metas de reproducción, checklist y bitácora de cría.

🤖 ASISTENTE CON INTELIGENCIA ARTIFICIAL
• Pregúntale al asistente sobre peces, parámetros, enfermedades o montaje.
• Respuestas claras, enfocadas 100% en acuariofilia.

📅 TAREAS Y RECORDATORIOS
• Programa cambios de agua, fertilización y mantenimiento.
• Recibe notificaciones para no olvidar nada.

🏆 LOGROS Y NIVELES
• Desbloquea logros y sube de nivel mientras cuidas tus acuarios.

👥 COMUNIDAD ACUARISTA
• Comparte fotos de tus acuarios, da "me gusta" y comenta.
• Descubre los montajes de otros acuaristas.

⭐ ¿POR QUÉ AQUARIA?
• Interfaz simple y cuidada, en español.
• Todo tu hobby organizado en un solo lugar.
• Pensada tanto para principiantes como para expertos.

Descarga Aquaria y lleva el cuidado de tus peces al siguiente nivel. 🐟💙

—
¿Dudas o sugerencias? Escríbenos a soporte@severeynfish.cl
Política de privacidad: https://fainall.github.io/fish/privacy-policy.html
```

---

## 5. Configuración de contenido de la app (App content)

### 5.1 Política de privacidad
- URL: `https://fainall.github.io/fish/privacy-policy.html`

### 5.2 Anuncios
- **¿La app contiene anuncios?** → **No**

### 5.3 Acceso a la app (App access)
- **¿Alguna función está restringida?** → **Sí, requiere credenciales.**
- Google pedirá un **usuario y contraseña de prueba** para revisar la app. Entrega la cuenta demo:
  - Usuario: *(cuenta de prueba que crees en la app)*
  - Contraseña: *(la de esa cuenta)*
  - Instrucciones: "Iniciar sesión con estas credenciales para acceder a todas las funciones."

### 5.4 Público objetivo y contenido (Target audience)
- **Grupo de edad objetivo:** 18 y más (o 13+). **NO** marcar "dirigido a niños".
- **¿Atrae a niños?** → No.

### 5.5 Apps de noticias → No.
### 5.6 COVID-19 → No aplica.
### 5.7 Datos gubernamentales → No.

---

## 6. 🔒 Data Safety (Seguridad de los datos) — MUY IMPORTANTE

### ¿La app recopila o comparte datos de usuario? → **SÍ**
### ¿Se cifran los datos en tránsito? → **SÍ** (HTTPS/TLS)
### ¿El usuario puede solicitar la eliminación de sus datos? → **SÍ** (la app tiene "Eliminar mi cuenta")

### Tipos de datos que se RECOPILAN:

| Categoría | Tipo de dato | ¿Recopilado? | ¿Compartido? | Propósito | ¿Obligatorio? |
|---|---|---|---|---|---|
| **Info personal** | Dirección de correo | Sí | No | Gestión de cuenta, autenticación | Obligatorio |
| **Info personal** | Nombre | Sí | No | Perfil de usuario | Obligatorio |
| **Fotos y videos** | Fotos | Sí | No | Fotos de acuarios/peces, posts, tickets | Opcional |
| **Mensajes** | Otros mensajes en la app | Sí | **Sí** (a OpenAI) | Respuestas del asistente de IA | Opcional |
| **Actividad en la app** | Interacciones (analítica) | Sí | No | Analítica de uso propia | Opcional |
| **Actividad en la app** | Contenido generado por el usuario | Sí | No | Comunidad (posts, comentarios) | Opcional |
| **App info y rendimiento** | Registros de fallos (crash logs) | Sí | **Sí** (a Sentry) | Diagnóstico y estabilidad | Opcional |
| **App info y rendimiento** | Diagnósticos | Sí | Sí (Sentry) | Rendimiento | Opcional |

> **Nota sobre "compartido":** el texto que el usuario envía al asistente de IA se procesa en **OpenAI** (servidores en EE. UU.), y los reportes de errores en **Sentry**. Supabase es el proveedor de backend (procesador de datos), no se declara como "compartido con terceros" sino como infraestructura.

### Prácticas de seguridad a marcar:
- ✅ Los datos están cifrados en tránsito.
- ✅ Puedes solicitar que se eliminen los datos.
- (Enlace de eliminación de cuenta: se hace **dentro de la app** → Perfil → Eliminar mi cuenta.)

---

## 7. 🎯 Clasificación de contenido (Content rating / IARC)

Responde el cuestionario así (respuestas honestas para Aquaria):

| Pregunta | Respuesta |
|---|---|
| ¿Violencia? | No |
| ¿Contenido sexual / desnudez? | No |
| ¿Lenguaje soez? | No |
| ¿Sustancias controladas (drogas/alcohol/tabaco)? | No |
| ¿Juegos de azar / apuestas? | No |
| ¿Miedo / terror? | No |
| **¿Los usuarios pueden interactuar o comunicarse entre sí?** | **Sí** (comunidad, comentarios) |
| **¿Los usuarios pueden compartir contenido generado por ellos?** | **Sí** (fotos, posts) |
| ¿Comparte la ubicación del usuario con otros? | No |
| ¿Compras digitales? | No |

> Con estas respuestas, la clasificación suele quedar en **PEGI 3 / Everyone** o **Teen** (por las funciones sociales). Es normal; solo responde con honestidad.

---

## 8. 🖼️ Recursos gráficos (checklist con especificaciones)

| Recurso | Obligatorio | Especificación |
|---|---|---|
| **Ícono de la app** | ✅ Sí | **512 × 512 px**, PNG de 32 bits, máx. 1 MB |
| **Gráfico destacado** (feature graphic) | ✅ Sí | **1024 × 500 px**, PNG o JPG, máx. 15 MB |
| **Capturas de teléfono** | ✅ Sí (mín. 2, máx. 8) | PNG/JPG, entre 320 px y 3840 px por lado. Recomendado **1080 × 1920 px** (vertical) |
| **Capturas de tablet 7"** | Opcional | Recomendado para mejor posicionamiento |
| **Capturas de tablet 10"** | Opcional | — |
| **Video promocional** | Opcional | URL de YouTube |

**Capturas sugeridas (elige las 4-6 mejores pantallas):**
1. Pantalla de un acuario con sus peces.
2. Registro/gráfico de parámetros del agua.
3. Ficha de un pez del catálogo.
4. El asistente de IA respondiendo.
5. La comunidad (feed de posts).
6. Logros / perfil.

> 💡 Tip: usa el mismo teléfono para todas las capturas y, si quieres que se vean profesionales, agrégales un marco de móvil + un texto corto describiendo la función (hay plantillas gratis en Canva).

---

## 9. Orden de publicación en Play Console (recordatorio)

1. Crear cuenta de organización + verificar (necesita D‑U‑N‑S) + pagar $25.
2. Crear la app → completar **ficha principal** (secciones 2-4 de este doc).
3. Completar **App content** (sección 5) + **Data Safety** (6) + **Clasificación** (7).
4. Subir el **AAB de producción** (ya generado).
5. **Prueba cerrada**: mín. **12 testers durante 14 días** (requisito para cuentas nuevas antes de producción).
6. Enviar a revisión → promover a **producción**.

**AAB final ya construido:**
`https://expo.dev/artifacts/eas/595UWS8ZYfeCjko51vJs5z74oyllmaxP5ZS3nz2jpAI.aab`
