// API Configuration
export const API_CONFIG = {
  BASE_URL: 'https://your-wordpress-site.com/wp-json',
  USE_MOCK_DATA: true, // Set to false when WordPress is ready
  TIMEOUT: 10000,
};

// App Configuration
export const APP_CONFIG = {
  APP_NAME: 'RaffleMania',
  MAX_ADS_PER_DAY: 10,
  CREDITS_PER_TICKET: 5,
  DEFAULT_DRAW_TIME: '20:00', // 8 PM
};

// Colors - Light Theme (Orange Theme)
export const COLORS = {
  primary: '#FF6B00',
  primaryDark: '#E55A00',
  primaryLight: '#FF8533',
  secondary: '#1A1A1A',
  accent: '#FFB366',
  success: '#00B894',
  warning: '#FDCB6E',
  error: '#E53935',

  background: '#FFFFFF',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  inputBg: '#F8F8F8',

  text: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  textLight: '#B2BEC3',

  border: '#E5E5E5',
  divider: '#E9ECEF',

  white: '#FFFFFF',
  black: '#000000',

  // Gradients
  gradientStart: '#FF6B00',
  gradientEnd: '#FF8533',
};

// Colors - Dark Theme
export const COLORS_DARK = {
  primary: '#FF6B00',
  primaryDark: '#E55A00',
  primaryLight: '#FF8533',
  secondary: '#F5F5F5',
  accent: '#FFB366',
  success: '#00B894',
  warning: '#FDCB6E',
  error: '#E53935',

  background: '#121212',
  surface: '#1E1E1E',
  card: '#252525',
  inputBg: '#2A2A2A',

  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textMuted: '#808080',
  textLight: '#666666',

  border: '#333333',
  divider: '#2A2A2A',

  white: '#FFFFFF',
  black: '#000000',

  // Gradients
  gradientStart: '#FF6B00',
  gradientEnd: '#FF8533',
};

// Gradient colors for themes
export const GRADIENT_COLORS = {
  light: ['#FFFFFF', '#FFFCF5', '#FFF5E6', '#FFECD2', '#FFE0BD'] as const,
  dark: ['#121212', '#181818', '#1E1E1E', '#252525', '#2A2A2A'] as const,
};

// Font Family - Comic Sans
export const FONT_FAMILY = {
  regular: 'Comic Sans MS',
  medium: 'Comic Sans MS',
  bold: 'Comic Sans MS',
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border Radius
export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

// Font Sizes
export const FONT_SIZE = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 24,
  xxxl: 32,
};

// Font Weights
export const FONT_WEIGHT = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Navigation
export const SCREENS = {
  // Auth
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',

  // Main Tabs
  HOME: 'Home',
  TICKETS: 'Tickets',
  PRIZES: 'Prizes',
  PROFILE: 'Profile',

  // Stack Screens
  TICKET_DETAIL: 'TicketDetail',
  PRIZE_DETAIL: 'PrizeDetail',
  CREDITS: 'Credits',
  WINNERS: 'Winners',
  REFERRAL: 'Referral',
  SETTINGS: 'Settings',
  ADDRESS_FORM: 'AddressForm',
  MY_WINS: 'MyWins',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  ONBOARDING_COMPLETE: 'onboarding_complete',
};
