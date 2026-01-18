import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ViewStyle,
  RefreshControl,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {COLORS, SPACING} from '../../utils/constants';
import {useThemeColors} from '../../hooks/useThemeColors';
import {AnimatedBackground} from './AnimatedBackground';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  padded?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  showParticles?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = true,
  refreshing = false,
  onRefresh,
  style,
  contentStyle,
  padded = true,
  edges = ['top', 'bottom'],
  showParticles = true,
}) => {
  const {gradientColors, isDark} = useThemeColors();

  const content = (
    <View style={[padded && styles.padded, contentStyle]}>{children}</View>
  );

  return (
    <LinearGradient
      colors={gradientColors as unknown as string[]}
      locations={[0, 0.25, 0.5, 0.75, 1]}
      start={{x: 0.5, y: 0}}
      end={{x: 0.5, y: 1}}
      style={styles.gradient}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      {showParticles && <AnimatedBackground />}
      <SafeAreaView style={[styles.container, style]} edges={edges}>
        {scrollable ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={COLORS.primary}
                  colors={[COLORS.primary]}
                />
              ) : undefined
            }>
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  padded: {
    paddingHorizontal: SPACING.md,
  },
});

export default ScreenContainer;
