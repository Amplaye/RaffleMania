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

// Colors
export const COLORS = {
  primary: '#6C5CE7',
  primaryDark: '#5B4BC7',
  secondary: '#00CEC9',
  accent: '#FDCB6E',
  success: '#00B894',
  warning: '#FDCB6E',
  error: '#FF7675',

  background: '#F8F9FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',

  text: '#2D3436',
  textSecondary: '#636E72',
  textLight: '#B2BEC3',

  border: '#DFE6E9',
  divider: '#E9ECEF',

  white: '#FFFFFF',
  black: '#000000',

  // Gradients
  gradientStart: '#6C5CE7',
  gradientEnd: '#A29BFE',
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
