import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet, Animated, Modal} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {FONT_FAMILY, FONT_WEIGHT, FONT_SIZE, RADIUS} from '../../utils/constants';

interface ExtractionStartEffectProps {
  visible: boolean;
  onAnimationComplete?: () => void;
}

export const ExtractionStartEffect: React.FC<ExtractionStartEffectProps> = ({
  visible,
  onAnimationComplete,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const textOpacityAnim = useRef(new Animated.Value(0)).current;
  const ringScale1 = useRef(new Animated.Value(0.5)).current;
  const ringScale2 = useRef(new Animated.Value(0.5)).current;
  const ringScale3 = useRef(new Animated.Value(0.5)).current;
  const ringOpacity1 = useRef(new Animated.Value(1)).current;
  const ringOpacity2 = useRef(new Animated.Value(1)).current;
  const ringOpacity3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Reset all animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      rotateAnim.setValue(0);
      pulseAnim.setValue(1);
      textOpacityAnim.setValue(0);
      ringScale1.setValue(0.5);
      ringScale2.setValue(0.5);
      ringScale3.setValue(0.5);
      ringOpacity1.setValue(1);
      ringOpacity2.setValue(1);
      ringOpacity3.setValue(1);

      // Main entrance animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Rotation animation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ).start();

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ).start();

      // Text fade in
      Animated.timing(textOpacityAnim, {
        toValue: 1,
        duration: 500,
        delay: 300,
        useNativeDriver: true,
      }).start();

      // Expanding rings animation
      const ringAnimation = (scaleRef: Animated.Value, opacityRef: Animated.Value, delay: number) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(scaleRef, {
                toValue: 3,
                duration: 1500,
                useNativeDriver: true,
              }),
              Animated.timing(opacityRef, {
                toValue: 0,
                duration: 1500,
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(scaleRef, {
                toValue: 0.5,
                duration: 0,
                useNativeDriver: true,
              }),
              Animated.timing(opacityRef, {
                toValue: 1,
                duration: 0,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ).start();
      };

      ringAnimation(ringScale1, ringOpacity1, 0);
      ringAnimation(ringScale2, ringOpacity2, 500);
      ringAnimation(ringScale3, ringOpacity3, 1000);

      // Complete after animation
      if (onAnimationComplete) {
        setTimeout(onAnimationComplete, 5000);
      }
    }
  }, [visible, onAnimationComplete, scaleAnim, opacityAnim, rotateAnim, pulseAnim, textOpacityAnim, ringScale1, ringScale2, ringScale3, ringOpacity1, ringOpacity2, ringOpacity3]);

  if (!visible) return null;

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.container}>
        {/* Background overlay */}
        <Animated.View style={[styles.overlay, {opacity: opacityAnim}]}>
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.95)', 'rgba(20, 0, 0, 0.98)', 'rgba(0, 0, 0, 0.95)']}
            style={styles.gradientOverlay}
          />
        </Animated.View>

        {/* Expanding rings */}
        <Animated.View
          style={[
            styles.ring,
            {
              transform: [{scale: ringScale1}],
              opacity: ringOpacity1,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            styles.ring2,
            {
              transform: [{scale: ringScale2}],
              opacity: ringOpacity2,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            styles.ring3,
            {
              transform: [{scale: ringScale3}],
              opacity: ringOpacity3,
            },
          ]}
        />

        {/* Main content */}
        <Animated.View
          style={[
            styles.content,
            {
              transform: [{scale: scaleAnim}, {scale: pulseAnim}],
              opacity: opacityAnim,
            },
          ]}>
          {/* Rotating outer ring */}
          <Animated.View style={[styles.rotatingRing, {transform: [{rotate}]}]}>
            <LinearGradient
              colors={['#FF6B00', '#FFD700', '#FF6B00', '#FF0000', '#FF6B00']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.rotatingRingGradient}
            />
          </Animated.View>

          {/* Center icon */}
          <LinearGradient
            colors={['#FF6B00', '#FF4500', '#CC0000']}
            style={styles.iconContainer}>
            <Ionicons name="trophy" size={60} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>

        {/* Text */}
        <Animated.View style={[styles.textContainer, {opacity: textOpacityAnim}]}>
          <Text style={styles.mainText}>ESTRAZIONE</Text>
          <Text style={styles.subText}>IN CORSO</Text>
          <View style={styles.dotsContainer}>
            <Animated.View style={[styles.dot, {opacity: pulseAnim}]} />
            <Animated.View style={[styles.dot, {opacity: pulseAnim}]} />
            <Animated.View style={[styles.dot, {opacity: pulseAnim}]} />
          </View>
        </Animated.View>

        {/* Video placeholder text */}
        <Animated.View style={[styles.videoPlaceholder, {opacity: textOpacityAnim}]}>
          <Ionicons name="videocam-outline" size={24} color="rgba(255, 255, 255, 0.5)" />
          <Text style={styles.placeholderText}>Video estrazione in arrivo...</Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientOverlay: {
    flex: 1,
  },
  ring: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#FF6B00',
  },
  ring2: {
    borderColor: '#FFD700',
  },
  ring3: {
    borderColor: '#FF0000',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotatingRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    padding: 4,
  },
  rotatingRingGradient: {
    flex: 1,
    borderRadius: 90,
    opacity: 0.6,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  textContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  mainText: {
    fontSize: 36,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
    letterSpacing: 8,
    textShadowColor: '#FF6B00',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 20,
  },
  subText: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FF6B00',
    letterSpacing: 6,
    marginTop: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B00',
  },
  videoPlaceholder: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: RADIUS.lg,
  },
  placeholderText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});

export default ExtractionStartEffect;
