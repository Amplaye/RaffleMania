import React from 'react';
import {View, StyleSheet, ViewStyle, TouchableOpacity} from 'react-native';
import {COLORS, RADIUS, SPACING} from '../../utils/constants';
import {useThemeColors} from '../../hooks/useThemeColors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: 'none' | 'small' | 'medium' | 'large';
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  padding = 'medium',
  elevated = true,
}) => {
  const {colors} = useThemeColors();

  const cardStyle: ViewStyle[] = [
    styles.card,
    {backgroundColor: colors.card},
    styles[`${padding}Padding`],
    elevated && styles.elevated,
    style,
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.9}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  elevated: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  nonePadding: {
    padding: 0,
  },
  smallPadding: {
    padding: SPACING.sm,
  },
  mediumPadding: {
    padding: SPACING.md,
  },
  largePadding: {
    padding: SPACING.lg,
  },
});

export default Card;
