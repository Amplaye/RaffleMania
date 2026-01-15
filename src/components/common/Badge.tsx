import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {COLORS, RADIUS, SPACING, FONT_SIZE, FONT_WEIGHT} from '../../utils/constants';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  text,
  variant = 'primary',
  size = 'medium',
  style,
}) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'secondary':
        return COLORS.secondary;
      case 'success':
        return COLORS.success;
      case 'warning':
        return COLORS.warning;
      case 'error':
        return COLORS.error;
      case 'info':
        return COLORS.textLight;
      default:
        return COLORS.primary;
    }
  };

  const getTextColor = () => {
    if (variant === 'warning') return COLORS.text;
    return COLORS.white;
  };

  return (
    <View
      style={[
        styles.badge,
        size === 'small' ? styles.smallBadge : styles.mediumBadge,
        {backgroundColor: getBackgroundColor()},
        style,
      ]}>
      <Text
        style={[
          styles.text,
          size === 'small' ? styles.smallText : styles.mediumText,
          {color: getTextColor()},
        ]}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  smallBadge: {
    paddingVertical: SPACING.xs / 2,
    paddingHorizontal: SPACING.sm,
  },
  mediumBadge: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  text: {
    fontWeight: FONT_WEIGHT.semibold,
  },
  smallText: {
    fontSize: FONT_SIZE.xs,
  },
  mediumText: {
    fontSize: FONT_SIZE.sm,
  },
});

export default Badge;
