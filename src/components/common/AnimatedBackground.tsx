import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated, Dimensions} from 'react-native';

const {width, height} = Dimensions.get('window');

// Neon orange color
const NEON_ORANGE = '#FF6B00';

interface FloatingParticleProps {
  delay: number;
  startX: number;
  size: number;
}

const FloatingParticle: React.FC<FloatingParticleProps> = ({
  delay,
  startX,
  size,
}) => {
  const translateY = useRef(new Animated.Value(height + 50)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      const duration = 8000 + Math.random() * 4000;

      translateY.setValue(height + 50);
      opacity.setValue(0);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          // Simple vertical movement from bottom to top
          Animated.timing(translateY, {
            toValue: -100,
            duration,
            useNativeDriver: true,
          }),
          // Fade in and out
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.7,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.7,
              duration: duration - 2500,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start(() => animate());
    };

    animate();
  }, [delay, translateY, opacity]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: startX,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
          transform: [{translateY}],
        },
      ]}
    />
  );
};

interface AnimatedBackgroundProps {
  particleCount?: number;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  particleCount = 15,
}) => {
  const particles = useRef(
    Array.from({length: particleCount}, (_, i) => ({
      id: i,
      delay: i * 600,
      startX: Math.random() * width,
      size: 4 + Math.random() * 6,
    })),
  ).current;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map(p => (
        <FloatingParticle
          key={p.id}
          delay={p.delay}
          startX={p.startX}
          size={p.size}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  particle: {
    position: 'absolute',
    backgroundColor: NEON_ORANGE,
    // Neon glow effect with gaussian blur simulation
    shadowColor: NEON_ORANGE,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
});

export default AnimatedBackground;
