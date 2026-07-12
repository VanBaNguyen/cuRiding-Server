/**
 * Raven Cockpit — the CuRiding visual system.
 *
 * Carleton Ravens colours (Carleton Red + carbon black) rendered as a vehicle
 * instrument cluster: carbon panels, hairline seams, and telemetry set in a
 * monospaced face like a real gauge. Carleton Red is the single hero accent.
 */

const palette = {
  // Carleton Red — the hero accent
  red: '#C8102E',
  redBright: '#EF1D3A',
  redDeep: '#4A0912',

  // Carbon surfaces (near-black cockpit)
  ravenBlack: '#0B0B0D',
  carbon: '#151518',
  carbonRaised: '#1E1E22',
  hairline: '#2A2A30',

  // Ink on dark
  ink: '#F4F4F5',
  inkMuted: '#8A8A93',
  inkFaint: '#5A5A63',

  // Semantic status (carry real safety meaning)
  success: '#2FD37A',
  warning: '#F4B740',
  braking: '#FF7A45',
  white: '#FFFFFF',
};

export const theme = {
  colors: {
    // Brand
    red: palette.red,
    redBright: palette.redBright,
    redDeep: palette.redDeep,

    // Surfaces
    background: palette.ravenBlack,
    surface: palette.carbon,
    surfaceRaised: palette.carbonRaised,
    border: palette.hairline,

    // Text
    ink: palette.ink,
    inkMuted: palette.inkMuted,
    inkFaint: palette.inkFaint,

    // Semantic
    danger: palette.red,
    warning: palette.warning,
    braking: palette.braking,
    success: palette.success,
    white: palette.white,

    // Dark tint fills for chips / banners
    chipBg: 'rgba(47,211,122,0.14)',
    emergencyBg: 'rgba(200,16,46,0.16)',
    warningBg: 'rgba(244,183,64,0.14)',
    brakingBg: 'rgba(255,122,69,0.14)',

    // Legacy aliases (kept so older references still resolve)
    primary: palette.red,
    primaryDark: palette.redBright,
    slate: palette.ink,
    slateMuted: palette.inkMuted,
    mapAccent: palette.red,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    pill: 999,
  },
  fonts: {
    mono: 'SpaceMono',
  },
} as const;

export const statusColors: Record<string, string> = {
  online: theme.colors.success,
  alert: theme.colors.warning,
  offline: theme.colors.warning,
  waiting: theme.colors.inkFaint,
  emergency: theme.colors.red,
};

export const statusLabels: Record<string, string> = {
  online: 'Online',
  alert: 'Rider alert',
  offline: 'Not reporting',
  waiting: 'Waiting for unit',
  emergency: 'Emergency',
};
