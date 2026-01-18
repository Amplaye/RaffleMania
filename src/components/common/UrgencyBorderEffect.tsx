import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface UrgencyBorderEffectProps {
  isActive: boolean;
  intensity?: 'low' | 'medium' | 'high';
}

export const UrgencyBorderEffect: React.FC<UrgencyBorderEffectProps> = ({
  isActive,
  intensity = 'medium',
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Pulse speed based on intensity
  const pulseDuration = intensity === 'high' ? 400 : intensity === 'medium' ? 600 : 900;

  useEffect(() => {
    if (isActive) {
      // Start subtle pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: pulseDuration,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: pulseDuration,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(0);
    }
  }, [isActive, pulseDuration, pulseAnim]);

  if (!isActive) return null;

  // Slightly more visible opacity range
  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.65],
  });

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Top border with gradient shadow */}
      <Animated.View style={[styles.edgeContainer, styles.topEdge, {opacity}]}>
        <View style={styles.borderLine} />
        <LinearGradient
          colors={['rgba(255, 50, 50, 0.4)', 'rgba(255, 50, 50, 0)']}
          start={{x: 0.5, y: 0}}
          end={{x: 0.5, y: 1}}
          style={styles.shadowGradient}
        />
      </Animated.View>

      {/* Bottom border with gradient shadow */}
      <Animated.View style={[styles.edgeContainer, styles.bottomEdge, {opacity}]}>
        <LinearGradient
          colors={['rgba(255, 50, 50, 0)', 'rgba(255, 50, 50, 0.4)']}
          start={{x: 0.5, y: 0}}
          end={{x: 0.5, y: 1}}
          style={styles.shadowGradient}
        />
        <View style={styles.borderLine} />
      </Animated.View>

      {/* Left border with gradient shadow */}
      <Animated.View style={[styles.edgeContainer, styles.leftEdge, {opacity}]}>
        <View style={styles.borderLineVertical} />
        <LinearGradient
          colors={['rgba(255, 50, 50, 0.4)', 'rgba(255, 50, 50, 0)']}
          start={{x: 0, y: 0.5}}
          end={{x: 1, y: 0.5}}
          style={styles.shadowGradientHorizontal}
        />
      </Animated.View>

      {/* Right border with gradient shadow */}
      <Animated.View style={[styles.edgeContainer, styles.rightEdge, {opacity}]}>
        <LinearGradient
          colors={['rgba(255, 50, 50, 0)', 'rgba(255, 50, 50, 0.4)']}
          start={{x: 0, y: 0.5}}
          end={{x: 1, y: 0.5}}
          style={styles.shadowGradientHorizontal}
        />
        <View style={styles.borderLineVertical} />
      </Animated.View>
    </View>
  );
};

const BORDER_WIDTH = 2;
const SHADOW_SIZE = 25;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
  },
  edgeContainer: {
    position: 'absolute',
  },
  topEdge: {
    top: 0,
    left: 0,
    right: 0,
    height: BORDER_WIDTH + SHADOW_SIZE,
    flexDirection: 'column',
  },
  bottomEdge: {
    bottom: 0,
    left: 0,
    right: 0,
    height: BORDER_WIDTH + SHADOW_SIZE,
    flexDirection: 'column',
  },
  leftEdge: {
    top: 0,
    bottom: 0,
    left: 0,
    width: BORDER_WIDTH + SHADOW_SIZE,
    flexDirection: 'row',
  },
  rightEdge: {
    top: 0,
    bottom: 0,
    right: 0,
    width: BORDER_WIDTH + SHADOW_SIZE,
    flexDirection: 'row',
  },
  borderLine: {
    height: BORDER_WIDTH,
    backgroundColor: '#FF3333',
    shadowColor: '#FF0000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  borderLineVertical: {
    width: BORDER_WIDTH,
    height: '100%',
    backgroundColor: '#FF3333',
    shadowColor: '#FF0000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  shadowGradient: {
    flex: 1,
  },
  shadowGradientHorizontal: {
    flex: 1,
  },
});

export default UrgencyBorderEffect;
