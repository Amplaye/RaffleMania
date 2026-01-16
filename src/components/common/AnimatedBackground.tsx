import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated, Dimensions} from 'react-native';

const {width, height} = Dimensions.get('window');

const PARTICLE_COLOR = '#FF6B00';

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
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      translateY.setValue(height + 50);
      translateX.setValue(0);
      opacity.setValue(0);
      rotate.setValue(0);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 8000 + Math.random() * 4000,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: (Math.random() - 0.5) * 100,
            duration: 8000 + Math.random() * 4000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: 5000,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(rotate, {
            toValue: 1,
            duration: 8000,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => animate());
    };

    animate();
  }, [delay]);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
          transform: [{translateY}, {translateX}, {rotate: rotateInterpolate}],
        },
      ]}
    />
  );
};

interface AnimatedBackgroundProps {
  particleCount?: number;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  particleCount = 12,
}) => {
  const particles = useRef(
    Array.from({length: particleCount}, (_, i) => ({
      id: i,
      delay: i * 600,
      startX: Math.random() * width,
      size: 6 + Math.random() * 10,
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
    backgroundColor: PARTICLE_COLOR,
  },
});

export default AnimatedBackground;
