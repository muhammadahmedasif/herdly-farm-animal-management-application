// Herdly Color System
export const Colors = {
  // Brand — premium navy gradient (top -> bottom)
  primary: '#1E3A5F',
  primaryLight: '#2A4D7C',
  primaryDark: '#152A45',
  primaryGradient: ['#1E3A5F', '#2A4D7C'] as [string, string],

  // Accent — Calving / Birth (deep teal, per design system)
  teal: '#006666',
  tealLight: '#CCEDED',

  // Status
  success: '#16A34A',
  successLight: '#DCFCE7',
  successText: '#166534',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningText: '#B45309',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  dangerText: '#B91C1C',
  info: '#2563EB',
  infoLight: '#DBEAFE',
  infoText: '#1D4ED8',
  purple: '#7C3AED',
  purpleLight: '#EDE9FE',

  // Neutrals
  background: '#F4F6FA',
  card: '#FFFFFF',
  border: '#E6EBF2',
  borderLight: '#F1F5F9',

  // Text
  textPrimary: '#0F2742',
  textSecondary: '#5B6B82',
  textMuted: '#94A3B8',
  textWhite: '#FFFFFF',

  // Surface
  surfaceHover: '#F8FAFC',
  overlay: 'rgba(15, 39, 66, 0.45)',

  // Tab bar
  tabActive: '#1E3A5F',
  tabInactive: '#94A3B8',
  tabBackground: '#FFFFFF',
};

// Shared elevation / shadow presets (cross-platform)
export const Shadows = {
  sm: {
    shadowColor: '#0F2742',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F2742',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F2742',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 6,
  },
  brand: {
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
};

// Consistent corner radius scale
export const Radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  full: 999,
};

export default Colors;

