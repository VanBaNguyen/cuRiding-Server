export const theme = {
  colors: {
    primary: '#0D9488',
    primaryDark: '#0F766E',
    slate: '#1E293B',
    slateMuted: '#64748B',
    background: '#F1F5F9',
    surface: '#FFFFFF',
    border: '#E2E8F0',
    danger: '#DC2626',
    warning: '#D97706',
    success: '#059669',
    braking: '#EA580C',
    mapAccent: '#0D9488',
    chipBg: '#CCFBF1',
    emergencyBg: '#FEE2E2',
    warningBg: '#FEF3C7',
    brakingBg: '#FFEDD5',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
} as const;

export const statusColors: Record<string, string> = {
  online: theme.colors.success,
  ai_warning: theme.colors.warning,
  braking: theme.colors.braking,
  emergency: theme.colors.danger,
  offline: theme.colors.slateMuted,
};

export const statusLabels: Record<string, string> = {
  online: 'Online',
  ai_warning: 'AI Warning',
  braking: 'Auto-braking',
  emergency: 'Emergency',
  offline: 'Offline',
};
