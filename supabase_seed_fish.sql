-- ============================================================
-- AquaManager — Fish catalog seed
-- Run AFTER supabase_schema.sql
-- ============================================================

INSERT INTO public.fish (
  common_name, scientific_name, family, origin,
  adult_size_cm, temp_min, temp_max, ph_min, ph_max, gh_min, gh_max,
  water_level, aggression, min_tank_liters,
  diet, description,
  is_schooling, schooling_min, water_type, tags, image_url,
  approved
) VALUES

-- ── BETTAS Y LABERÍNTICOS ────────────────────────────────────────────────────
(
  'Pez Betta','Betta splendens','Osphronemidae','Tailandia, Sudeste Asiático',
  7,24,30,6.0,7.5,5,20,'top',4,20,
  'Carnívoro — pellets, artemia, congelados',
  'Icónico por sus aletas largas y colores vibrantes. Los machos son extremadamente territoriales entre sí. Pez laberíntico que respira aire atmosférico.',
  false,NULL,'freshwater',
  ARRAY['popular','colorido','solitario','laberíntico','principiantes'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Betta_fish_%28Betta_splendens%29.jpg/800px-Betta_fish_%28Betta_splendens%29.jpg',
  true
),
(
  'Gourami Enano','Trichogaster lalius','Osphronemidae','India, Bangladés',
  8,22,28,6.0,7.5,4,18,'top',2,40,
  'Omnívoro — escamas, algas, artemia',
  'Pequeño y colorido gourami ideal para comunidades. El macho luce colores naranjas y azules brillantes. Pez laberíntico pacífico.',
  false,NULL,'freshwater',
  ARRAY['colorido','pacifico','laberíntico','comunidad'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Colisa_lalia-Male_and_Female.jpg/960px-Colisa_lalia-Male_and_Female.jpg',
  true
),
(
  'Gourami Perla','Trichopodus leerii','Osphronemidae','Malasia, Sumatra, Borneo',
  12,24,28,6.5,7.5,5,15,'middle',2,80,
  'Omnívoro — escamas, gusanos, vegetales',
  'Elegante gourami con patrón de perlas en todo el cuerpo. Muy pacífico y compatible con una amplia variedad de peces.',
  false,NULL,'freshwater',
  ARRAY['elegante','pacifico','laberíntico'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Trichopodus_leerii_Natural_History_Museum_University_of_Pisa.jpg/960px-Trichopodus_leerii_Natural_History_Museum_University_of_Pisa.jpg',
  true
),
(
  'Pez Paraíso','Macropodus opercularis','Osphronemidae','China, Corea, Vietnam',
  10,16,26,6.0,8.0,5,30,'top',4,60,
  'Carnívoro — insectos, gusanos, artemia',
  'Uno de los primeros peces ornamentales en Europa. Muy resistente y tolera agua fría. Agresivo con otros machos de su especie.',
  false,NULL,'freshwater',
  ARRAY['resistente','agresivo','agua fría','laberíntico'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/DV_Paradise_fish_male_05.jpg/960px-DV_Paradise_fish_male_05.jpg',
  true
),

-- ── TETRÁS Y CARÁCIDOS ───────────────────────────────────────────────────────
(
  'Neón Tetra','Paracheirodon innesi','Characidae','Amazonas, Perú',
  4,20,26,5.5,7.0,1,10,'middle',1,40,
  'Omnívoro — micro pellets, artemia, tubifex',
  'Uno de los peces más populares del mundo. Su franja azul neón y vientre rojo son inconfundibles. Necesita cardumen para sentirse seguro.',
  true,6,'freshwater',
  ARRAY['popular','cardumen','colorido','pacifico','principiantes'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Paracheirodon_innesi.jpg/800px-Paracheirodon_innesi.jpg',
  true
),
(
  'Tetra Cardinal','Paracheirodon axelrodi','Characidae','Venezuela, Brasil, Colombia',
  5,23,27,5.0,6.5,1,6,'middle',1,60,
  'Omnívoro — micro pellets, artemia',
  'Similar al Neón pero con la franja roja extendida por toda la parte inferior. Más exigente en cuanto a calidad de agua. Impresionante en cardúmenes grandes.',
  true,8,'freshwater',
  ARRAY['cardumen','colorido','amazonas','pacifico'],
  'https://upload.wikimedia.org/wikipedia/commons/2/2a/Paracheirodon_axelrodi.png',
  true
),
(
  'Tetra de Rummy Nose','Hemigrammus rhodostomus','Characidae','Amazonas, Brasil',
  5,24,28,5.5,7.0,1,8,'middle',1,60,
  'Omnívoro — escamas, micro pellets, artemia',
  'Reconocible por su nariz roja brillante y cola rayada. Forma cardúmenes muy compactos y sincronizados. Indicador de calidad del agua — palidece si el agua no está bien.',
  true,8,'freshwater',
  ARRAY['cardumen','pacifico','amazonas','indicador agua'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Hemigrammus_rhodostomus.jpg/960px-Hemigrammus_rhodostomus.jpg',
  true
),
(
  'Tetra Fantasma Negro','Hyphessobrycon megalopterus','Characidae','Brasil, Paraguay',
  6,22,26,6.0,7.5,4,18,'middle',2,60,
  'Omnívoro — escamas, artemia, vegetales',
  'Tetrá plateado con aleta dorsal y anal negras vistosas. Resistente y fácil de mantener. Puede ser levemente agresivo con peces de aletas largas.',
  true,5,'freshwater',
  ARRAY['cardumen','resistente','principiantes'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Hyphessobrycon_megalopterus_Porte_Doree.jpg/960px-Hyphessobrycon_megalopterus_Porte_Doree.jpg',
  true
),
(
  'Tetra Limón','Hyphessobrycon pulchripinnis','Characidae','Brasil',
  5,22,28,5.5,7.5,3,15,'middle',1,40,
  'Omnívoro — escamas, artemia',
  'Pequeño tetrá de color amarillo-limón con reflejos dorados. Muy pacifico y fácil de mantener. Buen candidato para acuarios comunitarios.',
  true,6,'freshwater',
  ARRAY['cardumen','pacifico','principiantes','comunidad'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Hyphessobrycon_pulchripinnis.jpg/960px-Hyphessobrycon_pulchripinnis.jpg',
  true
),
(
  'Tetra Serpae','Hyphessobrycon eques','Characidae','Amazonas, Paraguay',
  4,22,28,5.0,7.5,4,18,'middle',3,40,
  'Omnívoro — escamas, artemia, tubifex',
  'Tetrá de color rojo intenso con mancha negra. Puede mordisquear aletas largas. Mantenlo en grupos de al menos 8 para reducir la agresividad.',
  true,8,'freshwater',
  ARRAY['cardumen','moderado','colorido'],
  'https://upload.wikimedia.org/wikipedia/commons/4/4c/Hyphessobrycon_eques.jpg',
  true
),
(
  'Piraña Panza Roja','Pygocentrus nattereri','Serrasalmidae','Amazonas, Sudamérica',
  30,23,27,6.0,7.5,5,20,'middle',5,200,
  'Carnívoro — peces, camarones, carne',
  'La famosa piraña. Solo compatible consigo misma en grupos o en solitario. Espectacular pero requiere permisos legales en algunos países.',
  true,4,'freshwater',
  ARRAY['agresivo','grande','amazónico','avanzado','carnívoro'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Pygocentrus_nattereri_-_Karlsruhe_Zoo_01.jpg/960px-Pygocentrus_nattereri_-_Karlsruhe_Zoo_01.jpg',
  true
),

-- ── VIVÍPAROS ────────────────────────────────────────────────────────────────
(
  'Guppy','Poecilia reticulata','Poeciliidae','Caribe, Venezuela, Trinidad',
  6,22,28,6.8,7.8,8,20,'top',1,40,
  'Omnívoro — escamas, larvas de mosquito, artemia',
  'El pez ornamental más criado del mundo. Los machos tienen colas espectaculares y colores infinitos. Vivíparo fácil de reproducir.',
  false,NULL,'freshwater',
  ARRAY['popular','vivíparo','colorido','principiantes','cría fácil'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Fancy_guppies.jpg/800px-Fancy_guppies.jpg',
  true
),
(
  'Platy','Xiphophorus maculatus','Poeciliidae','México, Guatemala, Honduras',
  6,18,28,7.0,8.0,10,25,'middle',1,60,
  'Omnívoro — escamas, espirulina, artemia',
  'Robusto y pacífico, ideal para principiantes. Existe en docenas de variedades de color. Vivíparo muy productivo.',
  false,NULL,'freshwater',
  ARRAY['principiantes','vivíparo','comunitario','resistente'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Rainbow_platy.jpg/960px-Rainbow_platy.jpg',
  true
),
(
  'Pez Espada','Xiphophorus hellerii','Poeciliidae','México, Centroamérica',
  12,20,28,7.0,8.0,10,25,'middle',2,80,
  'Omnívoro — escamas, artemia, espirulina',
  'Los machos tienen una espectacular extensión en la cola inferior con forma de espada. Vivíparo activo que salta, tapa bien el acuario.',
  false,NULL,'freshwater',
  ARRAY['vivíparo','colorido','activo'],
  'https://upload.wikimedia.org/wikipedia/commons/1/14/Xiphophorus_helleri_03.jpg',
  true
),
(
  'Molli Negro','Poecilia sphenops','Poeciliidae','México, Centroamérica',
  10,22,28,7.0,8.5,10,30,'middle',2,80,
  'Omnívoro — preferencia por algas y vegetales',
  'Elegante pez de color negro intenso. Tolera agua salobre. Vivíparo prolífico.',
  false,NULL,'brackish',
  ARRAY['vivíparo','salobre','algas','principiantes'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Poecilia_sphenops%2C_Florida%2C_US_imported_from_iNaturalist_photo_487744119.jpeg/960px-Poecilia_sphenops%2C_Florida%2C_US_imported_from_iNaturalist_photo_487744119.jpeg',
  true
),
(
  'Endler','Poecilia wingei','Poeciliidae','Venezuela',
  3,22,30,6.5,8.0,8,25,'top',1,20,
  'Omnívoro — micro pellets, infusorios, algas',
  'Pariente del Guppy, más pequeño y rústico. Los machos tienen patrones de color únicos tipo mosaico. Perfecto para nano acuarios.',
  false,NULL,'freshwater',
  ARRAY['nano','vivíparo','colorido','principiantes'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Poecilia_wingei_Campoma_male_021en_20130303.jpg/960px-Poecilia_wingei_Campoma_male_021en_20130303.jpg',
  true
),

-- ── CÍCLIDOS AMERICANOS ──────────────────────────────────────────────────────
(
  'Pez Ángel','Pterophyllum scalare','Cichlidae','Amazonas, Perú, Ecuador',
  15,24,30,6.0,7.5,3,10,'middle',3,120,
  'Carnívoro — pellets, artemia, gusanos',
  'Cíclido majestuoso de forma triangular. Puede comerse peces pequeños. En época reproductiva se vuelve territorial.',
  false,NULL,'freshwater',
  ARRAY['cíclido','elegante','semi-agresivo','americano'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Pterophyllum_scalare_Natural_History_Museum_University_of_Pisa.jpg/960px-Pterophyllum_scalare_Natural_History_Museum_University_of_Pisa.jpg',
  true
),
(
  'Pez Disco','Symphysodon discus','Cichlidae','Amazonas, Brasil',
  20,28,32,5.0,6.5,1,4,'middle',2,200,
  'Carnívoro — corazón de buey, artemia, pellets premium',
  'El rey del acuario. Colores y patrones espectaculares. Requiere agua muy blanda y cálida. Exigente pero gratificante.',
  false,NULL,'freshwater',
  ARRAY['avanzado','colorido','grande','delicado','cíclido','amazónico'],
  'https://upload.wikimedia.org/wikipedia/commons/b/b6/Discus_heckel.jpg',
  true
),
(
  'Ram Alemán','Mikrogeophagus ramirezi','Cichlidae','Venezuela, Colombia',
  7,26,30,5.0,7.0,1,10,'bottom',2,80,
  'Omnívoro — pellets, artemia, gusanos de sangre',
  'Cíclido enano de colores exquisitos: amarillo, azul y rojo. Forma parejas monógamas y cuida su puesta con dedicación.',
  false,NULL,'freshwater',
  ARRAY['cíclido enano','colorido','pareja','amazónico'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Schmetterlingsbuntbarsch.jpg/960px-Schmetterlingsbuntbarsch.jpg',
  true
),
(
  'Apistogramma Agassizii','Apistogramma agassizii','Cichlidae','Amazonas, Brasil, Perú',
  9,24,28,5.0,7.0,1,8,'bottom',3,80,
  'Carnívoro — artemia, gusanos, micro presas',
  'Cíclido enano con cola en forma de lanza. El macho es muy colorido. Territorial en época de cría. Compatible con peces de capas superiores.',
  false,NULL,'freshwater',
  ARRAY['cíclido enano','avanzado','amazónico','cría'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Apistogramma_agassizii_in_aquarium.jpg/960px-Apistogramma_agassizii_in_aquarium.jpg',
  true
),
(
  'Cíclido Convicto','Amatitlania nigrofasciata','Cichlidae','Centroamérica',
  15,20,28,6.5,8.0,8,30,'middle',4,120,
  'Omnívoro — pellets, lombrices, espirulina',
  'Cíclido robusto con rayas verticales negras. Fácil de criar — hace puestas frecuentes y cuida ferozmente a sus crías. No apto para acuarios comunitarios.',
  false,NULL,'freshwater',
  ARRAY['cíclido','agresivo','cría fácil','resistente'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Archocentrus_nigrofasciatus_female.jpg/960px-Archocentrus_nigrofasciatus_female.jpg',
  true
),
(
  'Flowerhorn','Cichlasoma sp. (híbrido)','Cichlidae','Híbrido de acuario',
  30,26,30,7.0,8.0,9,20,'middle',5,300,
  'Carnívoro — pellets grandes, camarones, gusanos',
  'Híbrido de cíclidos con joroba cefálica prominente. Altamente agresivo — solo compatible consigo mismo o con su pareja. Muy inteligente y reconoce a su dueño.',
  false,NULL,'freshwater',
  ARRAY['agresivo','grande','solitario','inteligente','avanzado'],
  'https://upload.wikimedia.org/wikipedia/commons/c/ce/Gallery_19_68_148247.jpg',
  true
),
(
  'Oscars','Astronotus ocellatus','Cichlidae','Amazonas, Sudamérica',
  35,23,27,6.0,8.0,5,20,'all',5,300,
  'Carnívoro — pellets grandes, peces, camarones',
  'Cíclido grande e inteligente que reconoce a su dueño. Destruye plantas y decoración. Solo con peces de su mismo tamaño.',
  false,NULL,'freshwater',
  ARRAY['grande','agresivo','inteligente','cíclido','avanzado'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Astronotus_ocellatus.jpg/960px-Astronotus_ocellatus.jpg',
  true
),

-- ── CÍCLIDOS AFRICANOS ───────────────────────────────────────────────────────
(
  'Mbuna Zebra','Maylandia zebra','Cichlidae','Lago Malawi, África',
  13,24,28,7.5,8.5,10,20,'middle',4,200,
  'Herbívoro — espirulina, algas, vegetales',
  'Cíclido del Lago Malawi con rayas verticales azules y negras. Muy territorial. Mejor en grupos grandes para distribuir la agresividad.',
  true,6,'freshwater',
  ARRAY['africano','lago Malawi','agresivo','colorido','avanzado'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Maylandia_zebra_61728832.jpg/960px-Maylandia_zebra_61728832.jpg',
  true
),
(
  'Cíclido Pavo Real','Aulonocara nyassae','Cichlidae','Lago Malawi, África',
  15,24,28,7.5,8.5,10,20,'middle',3,200,
  'Carnívoro — invertebrados, pellets, artemia',
  'Cíclido africano con colores azules y amarillos deslumbrantes en el macho. Menos agresivo que otros Mbunas. El macho incuba los huevos en la boca.',
  false,NULL,'freshwater',
  ARRAY['africano','lago Malawi','colorido','incubador bucal'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Aulonocara_nyassae.JPG/960px-Aulonocara_nyassae.JPG',
  true
),
(
  'Frontosa','Cyphotilapia frontosa','Cichlidae','Lago Tanganica, África',
  35,24,26,7.8,9.0,10,20,'middle',3,400,
  'Carnívoro — peces, camarones, pellets grandes',
  'Imponente cíclido del Lago Tanganica con joroba frontal prominente. Colores azul y blanco en rayas. Crecimiento lento pero majestuoso.',
  true,4,'freshwater',
  ARRAY['africano','lago Tanganica','grande','avanzado'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Cyphotilapia_frontosa_-_Tanganjika-Beulenkopf.jpg/960px-Cyphotilapia_frontosa_-_Tanganjika-Beulenkopf.jpg',
  true
),

-- ── BARBS Y RASBORAS ────────────────────────────────────────────────────────
(
  'Barbo Tigre','Puntigrus tetrazona','Cyprinidae','Borneo, Sumatra',
  7,20,26,6.0,7.5,4,15,'middle',3,60,
  'Omnívoro — escamas, artemia, vegetales',
  'Barbo muy activo con rayas negras verticales sobre fondo naranja. Mordisquea aletas en grupos pequeños. En grupos de 8+ su agresividad disminuye.',
  true,8,'freshwater',
  ARRAY['activo','cardumen','mordedor','colorido'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Tiger_barb_fish.jpg/960px-Tiger_barb_fish.jpg',
  true
),
(
  'Barbo Cereza','Puntius titteya','Cyprinidae','Sri Lanka',
  5,22,27,6.0,7.5,5,18,'middle',1,40,
  'Omnívoro — escamas, artemia, algas',
  'Pequeño barbo pacífico de color rojo cereza en el macho. Especie en peligro de extinción en la naturaleza. Fácil de mantener.',
  true,6,'freshwater',
  ARRAY['pacifico','colorido','cardumen','principiantes'],
  'https://upload.wikimedia.org/wikipedia/commons/1/1f/Male_Cherry_Barb_700.jpg',
  true
),
(
  'Rasbora Arlequín','Trigonostigma heteromorpha','Cyprinidae','Malasia, Tailandia, Singapur',
  4.5,22,28,6.0,7.0,2,10,'middle',1,40,
  'Omnívoro — micro pellets, artemia',
  'Pequeño y elegante con parche triangular negro sobre fondo rosado-plateado. Pacifico y muy comunitario.',
  true,6,'freshwater',
  ARRAY['pacifico','cardumen','comunidad','principiantes'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/01.Rasbora_heteromorpha.jpg/960px-01.Rasbora_heteromorpha.jpg',
  true
),
(
  'Galaxy Rasbora','Danio margaritatus','Cyprinidae','Myanmar',
  2,20,26,6.5,7.5,5,15,'middle',1,20,
  'Omnívoro — micro pellets, infusorios, artemia baby',
  'Micro pez de galaxy: azul oscuro con puntos dorados y aletas rojas. Uno de los peces más pequeños y hermosos del hobby. Ideal para nano acuarios.',
  true,10,'freshwater',
  ARRAY['nano','colorido','cardumen','micro'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Danio_Margaritatus_malle_%28zoom%29.jpg/960px-Danio_Margaritatus_malle_%28zoom%29.jpg',
  true
),

-- ── DANIOS Y CIPRÍNIDOS ──────────────────────────────────────────────────────
(
  'Pez Cebra','Danio rerio','Cyprinidae','India, Bangladesh, Nepal',
  5,18,26,6.5,7.5,5,15,'top',1,40,
  'Omnívoro — escamas, micro pellets, artemia',
  'Pez activo y resistente con rayas horizontales azules y plateadas. Ideal para principiantes. Muy utilizado en investigación científica.',
  true,5,'freshwater',
  ARRAY['principiantes','resistente','activo','cardumen'],
  'https://upload.wikimedia.org/wikipedia/commons/a/ac/Zebrafisch.jpg',
  true
),
(
  'Carpa Koi','Cyprinus rubrofuscus','Cyprinidae','Japón (origen China)',
  90,5,25,6.5,8.5,5,20,'middle',1,1000,
  'Omnívoro — pellets Koi, vegetales, lombrices',
  'Carpa ornamental japonesa de gran tamaño. Para estanques exteriores. Longeva (hasta 30 años). Símbolo de buena suerte en la cultura oriental.',
  false,NULL,'freshwater',
  ARRAY['estanque','grande','longevo','exterior'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Ojiya_Nishikigoi_no_Sato_ac_%283%29.jpg/960px-Ojiya_Nishikigoi_no_Sato_ac_%283%29.jpg',
  true
),

-- ── CORYDORAS Y FONDO ────────────────────────────────────────────────────────
(
  'Corydora Panda','Corydoras panda','Callichthyidae','Perú',
  4,22,26,6.0,7.5,2,12,'bottom',1,40,
  'Omnívoro — pellets de fondo, tubifex, artemia',
  'Adorable Corydora con patrón blanco y negro similar al oso panda. Muy pacifico y activo en el fondo. Excelente compañero para comunidades.',
  true,4,'freshwater',
  ARRAY['fondo','pacifico','comunidad','limpiador','cardumen'],
  NULL,
  true
),
(
  'Corydora Bronze','Corydoras aeneus','Callichthyidae','Sudamérica (amplia distribución)',
  7,22,28,6.0,8.0,2,20,'bottom',1,60,
  'Omnívoro — pellets de fondo, detritos',
  'Corydora más común y resistente. Color bronce con reflejos verdes. Tolera una amplia gama de parámetros. Perfecto para principiantes.',
  true,4,'freshwater',
  ARRAY['fondo','pacifico','principiantes','resistente','cardumen'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Corydoras_aeneus_2.jpg/960px-Corydoras_aeneus_2.jpg',
  true
),
(
  'Locha Payaso','Chromobotia macracanthus','Botiidae','Sumatra, Borneo',
  30,25,30,6.0,7.5,5,12,'bottom',2,200,
  'Omnívoro — caracoles, pellets, gusanos',
  'Locha grande con rayas naranjas y negras. Excelente eliminator de caracoles. Crecimiento lento. Necesita grupos de al menos 5 individuos.',
  true,5,'freshwater',
  ARRAY['fondo','caracoles','grande','activo','cardumen'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Chromobotia_macracanthus.jpg/960px-Chromobotia_macracanthus.jpg',
  true
),
(
  'Locha Kuhli','Pangio kuhlii','Cobitidae','Sudeste Asiático',
  10,24,30,5.5,7.5,1,10,'bottom',1,60,
  'Omnívoro — pellets de fondo, gusanos, detritos',
  'Locha serpentiforme con bandas marrones y amarillas. Se esconde durante el día. Inocua y compatible con cualquier pez pacifico.',
  true,4,'freshwater',
  ARRAY['fondo','nocturno','pacifico','escondido'],
  NULL,
  true
),

-- ── PLECOS Y SILÚRIDOS ───────────────────────────────────────────────────────
(
  'Pleco Común','Hypostomus plecostomus','Loricariidae','Sudamérica (amplia distribución)',
  50,22,28,6.5,7.5,5,15,'bottom',2,300,
  'Herbívoro — algas, madera, zucchini, espirulina',
  'El famoso "come-algas". Crece muchísimo — muchos lo compran de jóvenes sin saber que llega a 50cm. Produce muchos desechos.',
  false,NULL,'freshwater',
  ARRAY['fondo','algas','grande','limpiador'],
  'https://upload.wikimedia.org/wikipedia/commons/c/c1/Hypostomus_plecostomus_-_Rapha%C3%ABl_Covain.png',
  true
),
(
  'Pleco Cepillo (BN)','Ancistrus sp.','Loricariidae','Sudamérica',
  15,22,28,6.5,7.5,2,18,'bottom',1,80,
  'Herbívoro — algas, madera, zucchini',
  'Versión pequeña del Pleco. Los machos tienen tentáculos ("cepillo") en el hocico. Come-algas eficiente y mucho más manejable que el pleco común.',
  false,NULL,'freshwater',
  ARRAY['fondo','algas','limpiador','pacifico','principiantes'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Ancistrus_sp._%28aka%29.jpg/960px-Ancistrus_sp._%28aka%29.jpg',
  true
),
(
  'Otocinclus','Otocinclus affinis','Loricariidae','Brasil',
  4,20,26,6.0,7.5,3,15,'bottom',1,40,
  'Herbívoro — algas blandas, biofilm, zucchini',
  'Minipleco especialista en algas blandas y biofilm. Ideal para acuarios plantados. Delicado — necesita acuario bien establecido.',
  true,4,'freshwater',
  ARRAY['nano','algas','plantado','pacifico','delicado'],
  'https://upload.wikimedia.org/wikipedia/commons/e/e4/Otocinclus_affinis.JPG',
  true
),
(
  'Pez Gato Vidrio','Kryptopterus vitreolus','Siluridae','Tailandia, Malasia',
  8,21,26,6.5,7.0,5,15,'middle',1,80,
  'Carnívoro — artemia, micro pellets, pequeños insectos',
  'Pez completamente transparente — puedes ver sus órganos internos. Pacifico y fascinante. Necesita cardumen para no estresarse.',
  true,6,'freshwater',
  ARRAY['transparente','pacifico','curioso','comunidad'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Glaswelse.jpg/960px-Glaswelse.jpg',
  true
),
(
  'Pez Cuchillo Negro','Apteronotus albifrons','Apteronotidae','Sudamérica',
  50,24,28,6.0,7.0,2,10,'bottom',3,250,
  'Carnívoro — gusanos, artemia, camarones, pellets',
  'Pez eléctrico de movimiento ondulante único. Negro con dos manchas blancas. Nocturno y tímido. Incompatible con peces de su misma especie.',
  false,NULL,'freshwater',
  ARRAY['eléctrico','nocturno','grande','curioso','avanzado'],
  'https://upload.wikimedia.org/wikipedia/commons/4/43/Black_Ghost_Knifefish_400.jpg',
  true
),

-- ── PECES GLOBO Y ESPECIALES ─────────────────────────────────────────────────
(
  'Pez Globo Enano','Carinotetraodon travancoricus','Tetraodontidae','India del Sur',
  2.5,22,28,7.0,8.0,8,20,'all',4,40,
  'Carnívoro — caracoles, gusanos, artemia congelada',
  'El pufferfish más pequeño del mundo. Ojos independientes, muerde aletas. Come caracoles. No puede vivir con casi ningún otro pez. Fascinante y con mucha personalidad.',
  false,NULL,'freshwater',
  ARRAY['nano','agresivo','curioso','caracoles','solitario'],
  NULL,
  true
),
(
  'Arowana Plateada','Osteoglossum bicirrhosum','Osteoglossidae','Amazonas, Sudamérica',
  90,24,30,6.0,7.0,1,8,'top',4,800,
  'Carnívoro — peces, insectos, ranas, ratones',
  'Majestuoso pez prehistórico. Saltador increíble — necesita tapa muy segura. Muy costoso. Salta hasta 2 metros para capturar presas.',
  false,NULL,'freshwater',
  ARRAY['grande','saltador','primitivo','avanzado','costoso'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Arawana_Image_001.jpg/960px-Arawana_Image_001.jpg',
  true
),

-- ── PECES DORADOS Y AGUA FRÍA ────────────────────────────────────────────────
(
  'Pez Dorado (Goldfish)','Carassius auratus','Cyprinidae','China (domesticado)',
  30,10,24,6.5,8.0,8,20,'all',1,80,
  'Omnívoro — pellets goldfish, vegetales, artemia',
  'El pez ornamental más antiguo del mundo. Pez de agua fría que NO debe estar con peces tropicales. Produce muchos desechos — necesita buen filtro.',
  false,NULL,'freshwater',
  ARRAY['agua fría','popular','principiantes','longevo'],
  'https://upload.wikimedia.org/wikipedia/commons/2/27/Orandagoldfish.jpg',
  true
),

-- ── MARINOS ──────────────────────────────────────────────────────────────────
(
  'Pez Payaso','Amphiprion ocellaris','Pomacentridae','Océano Índico, Pacífico',
  10,24,27,8.1,8.4,8,12,'middle',2,120,
  'Omnívoro — escamas marinas, copépodos, artemia',
  'El pez más famoso del hobby marino. Vive en simbiosis con anémonas. Hermafrodita secuencial — el dominante se convierte en hembra.',
  false,NULL,'saltwater',
  ARRAY['marino','icónico','anémona','colorido','principiantes marinos'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Clownfisch_%28Amphiprion_ocellaris%29.jpg/960px-Clownfisch_%28Amphiprion_ocellaris%29.jpg',
  true
),
(
  'Pez Cirujano Azul','Paracanthurus hepatus','Acanthuridae','Indo-Pacífico',
  31,24,26,8.1,8.4,8,12,'middle',3,400,
  'Herbívoro — algas, nori, espirulina',
  'Azul eléctrico con cola amarilla. Famoso por "Buscando a Dory". Susceptible al punto blanco (Ich). Necesita mucho espacio para nadar.',
  false,NULL,'saltwater',
  ARRAY['marino','grande','colorido','herbívoro','ich susceptible'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Paletten-Doktorfisch_ZooZ%C3%BCrich.JPG/960px-Paletten-Doktorfisch_ZooZ%C3%BCrich.JPG',
  true
),
(
  'Pez Tang Amarillo','Zebrasoma flavescens','Acanthuridae','Hawaii, Pacífico',
  20,24,27,8.1,8.4,8,12,'middle',3,300,
  'Herbívoro — algas, nori, pellets marinos',
  'Tang amarillo puro con espina caudal blanca. Uno de los peces marinos más populares. Agresivo con otros Tangs de su especie.',
  false,NULL,'saltwater',
  ARRAY['marino','colorido','herbívoro','popular'],
  'https://upload.wikimedia.org/wikipedia/commons/8/85/Zebrasoma_flavescens_taxo.jpg',
  true
),
(
  'Pez Mandarín','Synchiropus splendidus','Callionymidae','Pacífico Occidental',
  7,24,27,8.1,8.4,8,12,'bottom',1,200,
  'Carnívoro — copépodos vivos exclusivamente',
  'El pez más colorido del mundo. Solo come copépodos vivos — muy difícil de alimentar. Para acuarios con liverock abundante. Solo para expertos.',
  false,NULL,'saltwater',
  ARRAY['marino','colorido','avanzado','delicado','copépodos'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Synchiropus_splendidus_2_Luc_Viatour.jpg/960px-Synchiropus_splendidus_2_Luc_Viatour.jpg',
  true
),
(
  'Pez León','Pterois volitans','Scorpaenidae','Indo-Pacífico',
  38,22,27,8.1,8.4,8,12,'middle',4,300,
  'Carnívoro — peces vivos, camarones',
  'Espectacular pero venenoso. Sus espinas causan dolor intenso. Come peces pequeños. Majestuoso y lento. Mejor en acuario especimen.',
  false,NULL,'saltwater',
  ARRAY['marino','venenoso','grande','peligroso','avanzado'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Common_lion_fish_Pterois_volitans.jpg/960px-Common_lion_fish_Pterois_volitans.jpg',
  true
),
(
  'Pez Ángel Emperador','Pomacanthus imperator','Pomacanthidae','Indo-Pacífico',
  40,24,27,8.1,8.4,8,12,'middle',3,500,
  'Omnívoro — esponjas, algas, pellets marinos',
  'El pez marino más espectacular. Juveniles azul oscuro con líneas blancas curvas; adultos amarillos con líneas azules. Cambio de coloración dramático.',
  false,NULL,'saltwater',
  ARRAY['marino','colorido','grande','avanzado','icónico'],
  'https://upload.wikimedia.org/wikipedia/commons/0/03/Poimp_u0.gif',
  true
),
(
  'Gobio Watchman','Cryptocentrus cinctus','Gobiidae','Indo-Pacífico',
  10,22,27,8.1,8.4,8,12,'bottom',2,120,
  'Carnívoro — camarones, gusanos, artemia',
  'Simbiosis única con el camarón pistola — el camarón construye y mantiene la madriguera mientras el gobio hace guardia. Fascinante comportamiento.',
  false,NULL,'saltwater',
  ARRAY['marino','simbiosis','fondo','comunidad marina'],
  'https://upload.wikimedia.org/wikipedia/commons/f/f9/Alpheus_bellulus.JPG',
  true
),
(
  'Damisela de Tres Rayas','Dascyllus aruanus','Pomacentridae','Indo-Pacífico',
  8,24,28,8.1,8.4,8,12,'middle',3,120,
  'Omnívoro — escamas marinas, artemia, copépodos',
  'Pequeño pero muy territorial y agresivo. Blanco con rayas negras verticales. Resistente — a menudo usado para ciclar acuarios marinos.',
  false,NULL,'saltwater',
  ARRAY['marino','resistente','agresivo','principiantes marinos'],
  'https://upload.wikimedia.org/wikipedia/commons/8/86/Daaru_u0.png',
  true
),
(
  'Blenio Cortacésped','Salarias fasciatus','Blenniidae','Indo-Pacífico',
  14,24,27,8.1,8.4,8,12,'bottom',1,150,
  'Herbívoro — algas coralinas, biofilm, nori',
  'Excelente controlador de algas en acuarios de arrecife. Curioso y activo. Sus ojos se mueven de manera independiente.',
  false,NULL,'saltwater',
  ARRAY['marino','algas','arrecife','pacifico'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Salarias_fasciatus_Aquarium_DG.jpg/960px-Salarias_fasciatus_Aquarium_DG.jpg',
  true
),
(
  'Pez Ballesta Picasso','Rhinecanthus aculeatus','Balistidae','Indo-Pacífico',
  30,24,27,8.1,8.4,8,12,'middle',5,400,
  'Carnívoro — erizos, cangrejos, mejillones, pellets',
  'Patrón de colores único estilo pintura abstracta. Extremadamente agresivo — destruirá corales e invertebrados. Solo con peces grandes y resistentes.',
  false,NULL,'saltwater',
  ARRAY['marino','agresivo','grande','colorido','avanzado'],
  NULL,
  true
),

-- ── AGUA SALOBRE ─────────────────────────────────────────────────────────────
(
  'Pez Globo de Ocho','Tetraodon biocellatus','Tetraodontidae','Sudeste Asiático',
  8,24,28,7.5,8.5,10,20,'middle',4,80,
  'Carnívoro — caracoles, mejillones, gusanos, gambas',
  'Pez globo con patrón de figura ocho en el dorso. Come caracoles y corta dientes continuamente. Muy inteligente y personalidad única. Peligroso con otros peces.',
  false,NULL,'brackish',
  ARRAY['salobre','agresivo','curioso','inteligente','caracoles'],
  NULL,
  true
),
(
  'Pez Arquero','Toxotes jaculatrix','Toxotidae','Sudeste Asiático, Australia',
  25,25,30,7.0,8.0,10,25,'top',3,200,
  'Carnívoro — insectos, escupetazo de agua',
  'Captura insectos escupiéndoles agua desde abajo. Habilidad de puntería increíble. Necesita espacio sobre el agua con vegetación para practicar.',
  false,NULL,'brackish',
  ARRAY['salobre','curioso','insectos','superficie','especial'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Toxotes_jaculatrix.jpg/960px-Toxotes_jaculatrix.jpg',
  true
),
(
  'Monodáctilo Plateado','Monodactylus argenteus','Monodactylidae','Indo-Pacífico',
  27,23,28,7.5,8.5,10,25,'middle',2,300,
  'Omnívoro — escamas, artemia, vegetales',
  'Pez de forma romboidal plateada con rayas negras y amarillas. Activo nadador. Tolera agua dulce de joven pero necesita agua salobre de adulto.',
  true,3,'brackish',
  ARRAY['salobre','activo','grande'],
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Silver_Moony.jpg/960px-Silver_Moony.jpg',
  true
)

ON CONFLICT DO NOTHING;
