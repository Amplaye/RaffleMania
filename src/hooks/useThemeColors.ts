import {useThemeStore} from '../store/useThemeStore';
import {COLORS, COLORS_DARK, GRADIENT_COLORS, NEON_STYLES} from '../utils/constants';

export const useThemeColors = () => {
  const {theme} = useThemeStore();
  const isDark = theme === 'dark';

  return {
    colors: isDark ? COLORS_DARK : COLORS,
    gradientColors: isDark ? GRADIENT_COLORS.dark : GRADIENT_COLORS.light,
    neon: isDark ? NEON_STYLES.dark : NEON_STYLES.light,
    isDark,
  };
};
