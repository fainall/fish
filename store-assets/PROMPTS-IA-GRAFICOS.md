# 🎨 Prompts para generar el Gráfico Destacado de Aquaria

**Medida final obligatoria:** 1024 × 500 px (relación ≈ 2:1)
**Marca:** Aquaria — app de gestión de acuarios
**Paleta:** azul marino profundo `#000516` · cian reef `#0090BF` · cian claro `#33B8D4` · turquesa `#7FE3F5`

> ⚠️ **Importante:** la mayoría de las IA de imagen escriben MAL el texto. **Recomendación:** genera el
> banner **SIN texto** (o con espacio libre) y luego se le sobrepone el logo/texto. Si quieres texto
> incrustado, usa **Ideogram** o **Flux**, que son los mejores en tipografía.

---

## 🥇 PROMPT PRINCIPAL (recomendado — sin texto, espacio para logo)

**Inglés (funciona mejor en todos los modelos):**
```
Wide horizontal promotional banner for a mobile app about aquariums. A breathtaking
underwater scene inside a pristine planted freshwater aquarium: a school of vibrant
neon tetras and one elegant betta fish with flowing fins swimming among lush green
aquatic plants and driftwood. Soft god rays of light filtering down from the surface,
delicate air bubbles rising, subtle particles floating. Deep navy blue to teal cyan
gradient, rich and cinematic. The left third of the image is darker, clean and
uncluttered, leaving negative space for a logo. Modern, premium, polished, high-end
app store banner aesthetic. Sharp focus on the fish, soft depth of field background.
Ultra detailed, professional product photography lighting, 8k.
--ar 2:1 --style raw
```

**Español (por si tu herramienta lo pide en español):**
```
Banner horizontal panorámico para una app móvil de acuarios. Escena submarina
espectacular dentro de un acuario plantado de agua dulce: un cardumen de tetras neón
vibrantes y un pez betta elegante de aletas fluidas nadando entre plantas acuáticas
verdes y troncos. Rayos de luz suaves filtrándose desde la superficie, burbujas
delicadas ascendiendo, partículas flotando. Degradado azul marino profundo a cian
turquesa, rico y cinematográfico. El tercio izquierdo de la imagen es más oscuro,
limpio y despejado, dejando espacio negativo para un logo. Estético, premium, pulido,
estilo banner de tienda de apps. Enfoque nítido en los peces, fondo con profundidad
de campo suave. Ultra detallado, iluminación profesional, 8k.
Relación de aspecto 2:1
```

---

## 🥈 VARIANTE A — Ilustración vectorial moderna (más "app", menos foto)

```
Modern flat vector illustration banner for an aquarium management mobile app.
Stylized underwater aquarium scene with geometric tropical fish, minimal aquatic
plants, and clean rising bubbles. Smooth gradients from deep navy #000516 to bright
cyan #33B8D4. Minimalist, elegant, lots of negative space on the left side for a
logo. Flat design with subtle depth, soft glows, premium tech startup aesthetic.
Clean composition, no text.
--ar 2:1
```

---

## 🥉 VARIANTE B — 3D render premium

```
Premium 3D render banner for an aquarium app. A glowing glass aquarium tank floating
in a dark navy void, softly illuminated from within with cyan light, tropical fish
swimming inside, water caustics and light refraction, bubbles. Cinematic studio
lighting, glossy reflections, octane render quality, dark background with cyan rim
light. Empty clean space on the left for branding. Ultra modern, high-end, polished.
--ar 2:1
```

---

## 🎯 VARIANTE C — Con texto incrustado (usar en **Ideogram** o **Flux**)

```
Wide app store feature banner. Left side: the bold text "AQUARIA" in clean modern
white sans-serif letters with wide letter spacing, and below it in smaller lighter
cyan text: "Gestiona tus acuarios". Right side: a beautiful underwater aquarium scene
with colorful tropical fish, green aquatic plants, rising bubbles, and soft light rays.
Deep navy blue to cyan gradient background. Modern, premium, clean, professional.
Typography must be crisp and perfectly spelled.
--ar 2:1
```

---

## 🚫 Prompt negativo (si tu herramienta lo soporta)

```
text, watermark, logo, letters, words, blurry, low quality, distorted fish,
deformed, cluttered, busy, oversaturated, cartoon, childish, ugly, jpeg artifacts,
border, frame, collage, multiple panels
```

---

## ⚙️ Ajustes por herramienta

| Herramienta | Cómo fijar la proporción | Nota |
|---|---|---|
| **Midjourney** | `--ar 2:1` al final | Mejor calidad artística. Añade `--style raw` para más realismo |
| **Ideogram** | Elegir aspect ratio **2:1** | 👑 El mejor si quieres **texto legible** |
| **DALL·E 3 / ChatGPT** | Pedir "wide banner, 2:1 aspect ratio" | No permite medidas exactas; luego se recorta |
| **Flux** | `--ar 2:1` o 1024x512 | Muy bueno en texto y realismo |
| **Leonardo.ai** | Preset "Wide" + custom 1024x512 | Tiene plantillas de banners |

---

## ✅ Paso final (lo hago yo)

Ninguna IA te va a dar exactamente **1024×500**. Cuando tengas la imagen que te guste:

1. Guárdala en `aquamanager\store-assets\` (o en Descargas).
2. Dime el nombre del archivo.
3. Yo la **redimensiono/recorto a 1024×500 exacto** y verifico que cumpla el límite de 15 MB.

> 💡 **Tip de composición:** Google a veces recorta el gráfico en algunos lugares de la tienda.
> Mantén lo importante **centrado** y evita poner elementos clave muy cerca de los bordes.
