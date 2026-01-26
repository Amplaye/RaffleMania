import {Platform} from 'react-native';

// API Configuration
export const API_CONFIG = {
  BASE_URL: 'https://rafflemania.it/wp-json/rafflemania/v1',
  USE_MOCK_DATA: false, // Set to true for testing with mock data
  TIMEOUT: 15000,
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

// Neon Effect Styles - Platform-aware for iOS/Android consistency
export const NEON_STYLES = {
  light: {
    // Subtle neon for light theme
    glow: Platform.select({
      ios: {
        shadowColor: '#FF6B00',
        shadowOffset: {width: 0, height: 0},
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
    glowStrong: Platform.select({
      ios: {
        shadowColor: '#FF6B00',
        shadowOffset: {width: 0, height: 0},
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
    glowSubtle: Platform.select({
      ios: {
        shadowColor: '#FF6B00',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
    textShadow: {
      textShadowColor: 'rgba(255, 107, 0, 0.4)',
      textShadowOffset: {width: 0, height: 0},
      textShadowRadius: 8,
    },
  },
  dark: {
    // Strong neon for dark theme - more visible glow
    glow: Platform.select({
      ios: {
        shadowColor: '#FF6B00',
        shadowOffset: {width: 0, height: 0},
        shadowOpacity: 0.8,
        shadowRadius: 15,
      },
      android: {
        elevation: 12,
      },
    }),
    glowStrong: Platform.select({
      ios: {
        shadowColor: '#FF6B00',
        shadowOffset: {width: 0, height: 0},
        shadowOpacity: 1,
        shadowRadius: 25,
      },
      android: {
        elevation: 16,
      },
    }),
    glowSubtle: Platform.select({
      ios: {
        shadowColor: '#FF6B00',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.6,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
    textShadow: {
      textShadowColor: 'rgba(255, 107, 0, 0.8)',
      textShadowOffset: {width: 0, height: 0},
      textShadowRadius: 15,
    },
  },
};

// Font Family - Poppins
export const FONT_FAMILY = {
  regular: 'Poppins-Regular',
  medium: 'Poppins-Medium',
  semibold: 'Poppins-SemiBold',
  bold: 'Poppins-Bold',
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
  LEADERBOARD: 'Leaderboard',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  ONBOARDING_COMPLETE: 'onboarding_complete',
};
