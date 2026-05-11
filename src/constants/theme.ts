// ── Aquaria Design System · "Sunlit Reef" ──────────────────────────────────────
// Philosophy: Sunlight filtering through shallow, clear water.
// Clean whites, soft aqua tints, deep navy text. Bright and airy.

export const COLORS = {
  // ── Backgrounds · surface layers ────────────────────────────────────────────
  abyss:           '#DCF0F8',   // lightest tinted wash (used as deepest layer)
  background:      '#F2F8FC',   // main app background
  backgroundCard:  '#FFFFFF',   // standard card surface
  backgroundLight: '#EAF4FA',   // elevated cards, modals
  surface:         '#D4EAF5',   // interactive surfaces, selected states
  thermocline:     '#FFFFFF',   // alias
  twilight:        '#EAF4FA',   // alias

  // ── Primary accent · reef water ──────────────────────────────────────────────
  primary:      '#0090BF',   // deep reef cyan — readable on white
  primaryDark:  '#006E99',   // ocean deep
  primaryLight: '#33B8D4',   // surface shimmer

  // ── Semantic · coral reef tones ──────────────────────────────────────────────
  success:  '#009870',   // seagrass — deep teal-green
  warning:  '#C87D00',   // amber coral — warm but readable
  error:    '#D94040',   // fire coral — vivid on light
  accent:   '#7052C8',   // purple urchin — achievements, special

  // ── Text ────────────────────────────────────────────────────────────────────
  text:          '#0C1E2D',   // deep navy — near black, not pure black
  textSecondary: '#2E6680',   // ocean mid-tone
  textMuted:     '#6A9AB8',   // shallow water haze
  white:         '#FFFFFF',

  // ── Borders ─────────────────────────────────────────────────────────────────
  border:        '#C5DDE9',   // frosted glass edge

  // ── Compatibility (keep same names for compatibility) ────────────────────────
  compatible:   '#009870',
  caution:      '#C87D00',
  incompatible: '#D94040',
};

// ── Typography scale ──────────────────────────────────────────────────────────
// Display: DM Serif Display (emotional, editorial)
// Body/UI: DM Sans (geometric, warm, readable)
// Values: JetBrains Mono (precise, scientific)
export const FONTS = {
  display: 'DMSerifDisplay_400Regular',
  sans:    'DMSans_400Regular',
  sansMd:  'DMSans_500Medium',
  sansSb:  'DMSans_600SemiBold',
  sansBd:  'DMSans_700Bold',
  sansEb:  'DMSans_800ExtraBold',
  mono:    'JetBrainsMono_600SemiBold',
  // Fallbacks when fonts not loaded
  regular: 'System',
  medium:  'System',
  bold:    'System',
};

// ── Spacing · "Wave Rhythm" 8px base ─────────────────────────────────────────
export const SPACING = {
  xs:  8,
  sm:  12,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
  // Screen horizontal padding — always 20px
  screen: 20,
};

// ── Border radius · organic, not geometric ────────────────────────────────────
export const BORDER_RADIUS = {
  sm:   8,    // small chips, internal elements
  md:   16,   // components, buttons
  lg:   20,   // standard cards
  xl:   24,   // hero cards, main containers
  xxl:  28,   // modals, bottom sheets
  full: 9999, // pills, avatars, toggles
};

// ── Shadows · depth-based ─────────────────────────────────────────────────────
// The top "highlight" (inset simulation) uses borderTopColor instead of
// inset shadow (not supported in RN). Apply via topHighlight on card styles.
export const SHADOWS = {
  sm: {
    shadowColor: '#083050',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: '#083050',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#083050',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 10,
  },
};

// ── Card presets ──────────────────────────────────────────────────────────────
// Card A: "Coral Stone" — standard white card with subtle border
export const CARD_STONE = {
  backgroundColor: COLORS.backgroundCard,
  borderRadius: BORDER_RADIUS.xl,
  borderWidth: 1,
  borderColor: COLORS.border,
  ...SHADOWS.sm,
};

// Card B: "Glass" — light tinted surface (for stats, modals)
export const CARD_GLASS = {
  backgroundColor: COLORS.backgroundLight,
  borderRadius: BORDER_RADIUS.xl,
  borderWidth: 1,
  borderColor: 'rgba(0,144,191,0.12)',
  ...SHADOWS.md,
};

// ── Animation physics ─────────────────────────────────────────────────────────
export const SPRING = {
  gentle:  { tension: 120, friction: 20 },  // cards entering
  snap:    { tension: 300, friction: 25 },  // tap response
  float:   { tension: 60,  friction: 12 },  // floating elements
};
