import {Platform, StyleSheet, ViewStyle, TextStyle} from 'react-native';

/**
 * Platform-aware style utilities for consistent iOS/Android appearance
 */

// Platform-specific shadow that works correctly on both iOS and Android
export const createShadow = (
  color: string,
  offsetY: number = 4,
  opacity: number = 0.3,
  radius: number = 8,
  elevation: number = 6
): ViewStyle => {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: {width: 0, height: offsetY},
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: {
      elevation: elevation,
    },
  }) as ViewStyle;
};

// Neon glow effect that works on both platforms
export const createNeonGlow = (color: string, intensity: 'subtle' | 'normal' | 'strong' = 'normal'): ViewStyle => {
  const configs = {
    subtle: {ios: {opacity: 0.3, radius: 6}, android: {elevation: 4}},
    normal: {ios: {opacity: 0.5, radius: 10}, android: {elevation: 8}},
    strong: {ios: {opacity: 0.7, radius: 15}, android: {elevation: 12}},
  };

  const config = configs[intensity];

  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: {width: 0, height: 0},
      shadowOpacity: config.ios.opacity,
      shadowRadius: config.ios.radius,
    },
    android: {
      elevation: config.android.elevation,
    },
  }) as ViewStyle;
};

// Platform-specific font family
// Comic Sans MS may not be available on all devices, use system fonts as fallback
export const getFontFamily = (weight: 'regular' | 'medium' | 'bold' = 'regular'): string => {
  return Platform.select({
    ios: 'System',
    android: 'Roboto',
  }) || 'System';
};

// Platform-specific text styles to ensure consistent rendering
export const createTextStyle = (fontSize: number, fontWeight: TextStyle['fontWeight'] = '400'): TextStyle => {
  return Platform.select({
    ios: {
      fontSize,
      fontWeight,
      // iOS needs explicit lineHeight for consistent text positioning
      lineHeight: fontSize * 1.2,
    },
    android: {
      fontSize,
      fontWeight,
      // Android has different default line height
      lineHeight: fontSize * 1.25,
      // Fix Android text cut-off issue
      includeFontPadding: false,
    },
  }) as TextStyle;
};

// Platform-specific input styles
export const getInputStyles = (): ViewStyle & TextStyle => {
  return Platform.select({
    ios: {
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    android: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      // Android TextInput has extra padding by default
      textAlignVertical: 'center' as const,
    },
  }) as ViewStyle & TextStyle;
};

// Platform-specific button padding (iOS needs slightly more)
export const getButtonPadding = (size: 'small' | 'medium' | 'large' = 'medium'): ViewStyle => {
  const paddings = {
    small: Platform.select({
      ios: {paddingVertical: 10, paddingHorizontal: 16},
      android: {paddingVertical: 8, paddingHorizontal: 14},
    }),
    medium: Platform.select({
      ios: {paddingVertical: 16, paddingHorizontal: 24},
      android: {paddingVertical: 14, paddingHorizontal: 22},
    }),
    large: Platform.select({
      ios: {paddingVertical: 20, paddingHorizontal: 32},
      android: {paddingVertical: 18, paddingHorizontal: 30},
    }),
  };

  return paddings[size] as ViewStyle;
};

// Platform-specific border radius handling
// On Android, overflow: 'hidden' with borderRadius can cause issues with shadows
export const getBorderRadiusStyle = (radius: number, needsShadow: boolean = false): ViewStyle => {
  if (Platform.OS === 'android' && needsShadow) {
    // On Android, we might need to avoid overflow: hidden to preserve elevation shadow
    return {
      borderRadius: radius,
    };
  }
  return {
    borderRadius: radius,
    overflow: 'hidden',
  };
};

// Platform-specific gap polyfill for older React Native versions
// For most cases, use marginRight/marginBottom instead of gap for better compatibility
export const createFlexGap = (gap: number, direction: 'row' | 'column' = 'row'): ViewStyle => {
  // Modern RN supports gap, but for maximum compatibility:
  return {
    gap: gap,
  };
};

// Platform-specific modal positioning
export const getModalOverlayStyle = (): ViewStyle => {
  return Platform.select({
    ios: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    android: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  }) as ViewStyle;
};

// Fix for consistent card/box sizes across platforms
export const normalizeSize = (size: number): number => {
  // Android might render slightly smaller, so we can adjust
  return Platform.OS === 'android' ? Math.ceil(size) : size;
};

// Platform-specific StatusBar height approximation
export const getStatusBarHeight = (): number => {
  return Platform.select({
    ios: 44, // Safe area for notch devices, 20 for older
    android: 24, // StatusBar.currentHeight is more accurate but this is a safe default
  }) || 0;
};

// Combined platform-specific styles for common UI elements
export const PlatformStyles = StyleSheet.create({
  // Card with shadow
  cardShadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
  }) as ViewStyle,

  // Button with shadow
  buttonShadow: Platform.select({
    ios: {
      shadowColor: '#FF6B00',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    android: {
      elevation: 6,
    },
  }) as ViewStyle,

  // Input field
  inputBase: Platform.select({
    ios: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 16,
    },
    android: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      textAlignVertical: 'center',
    },
  }) as ViewStyle & TextStyle,

  // Centered text container
  textContainer: Platform.select({
    ios: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    android: {
      alignItems: 'center',
      justifyContent: 'center',
      // Android may need explicit dimensions for centering to work properly
    },
  }) as ViewStyle,

  // Fix for text inside flexbox on Android
  flexText: Platform.select({
    ios: {},
    android: {
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
  }) as TextStyle,
});

export default {
  createShadow,
  createNeonGlow,
  getFontFamily,
  createTextStyle,
  getInputStyles,
  getButtonPadding,
  getBorderRadiusStyle,
  createFlexGap,
  getModalOverlayStyle,
  normalizeSize,
  getStatusBarHeight,
  PlatformStyles,
};
