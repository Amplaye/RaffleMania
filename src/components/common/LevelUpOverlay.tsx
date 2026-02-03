import React, {useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useLevelUpStore} from '../../store/useLevelUpStore';
import {useThemeColors} from '../../hooks/useThemeColors';
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
  SPACING,
} from '../../utils/constants';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

// Epic confetti particle - explodes from bottom to top
const Particle: React.FC<{index: number; startAnim: boolean}> = ({index, startAnim}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Start from bottom center, spread outward
  const spreadAngle = (Math.random() - 0.5) * Math.PI * 0.8; // -72 to +72 degrees
  const explosionForce = 300 + Math.random() * 200;
  const startX = 0;
  const startY = SCREEN_HEIGHT * 0.3;
  const delay = Math.random() * 200;
  const duration = 1800 + Math.random() * 800;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!startAnim) {
      translateY.setValue(startY);
      translateX.setValue(startX);
      rotate.setValue(0);
      scale.setValue(0);
      opacity.setValue(0);
      return;
    }

    // Reset values
    translateY.setValue(startY);
    translateX.setValue(startX);
    rotate.setValue(0);
    scale.setValue(0);
    opacity.setValue(0);

    // Calculate end position based on explosion angle
    const endX = Math.sin(spreadAngle) * explosionForce;
    const endY = -Math.cos(spreadAngle) * explosionForce - 100; // Go up
    const rotations = 4 + Math.random() * 6;

    Animated.parallel([
      // Pop in quickly
      Animated.sequence([
        Animated.delay(delay),
        Animated.spring(scale, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
      ]),
      // Explode upward
      Animated.timing(translateY, {
        toValue: endY,
        duration,
        delay,
        useNativeDriver: true,
      }),
      // Spread horizontally
      Animated.timing(translateX, {
        toValue: endX,
        duration,
        delay,
        useNativeDriver: true,
      }),
      // Fast spin
      Animated.timing(rotate, {
        toValue: rotations,
        duration,
        delay,
        useNativeDriver: true,
      }),
      // Fade in then out
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.delay(duration - 600),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startAnim]);

  const colors = [
    '#FF6B00', '#FFD700', '#FF8500', '#FFA500', '#FFCC00',
    '#FFFFFF', '#FF4500', '#FFC107', '#FF9800', '#FFEB3B',
  ];
  const color = colors[index % colors.length];

  // Varied sizes - some bigger for more impact
  const baseSize = 8 + (index % 5) * 4;
  const isLarge = index % 6 === 0;
  const size = isLarge ? baseSize * 1.8 : baseSize;

  // Different shapes: circle, square, rectangle, star-like
  const shapeType = index % 4;
  const borderRadius = shapeType === 0 ? size / 2 : shapeType === 1 ? 3 : shapeType === 2 ? 0 : size / 4;
  const width = shapeType === 3 ? size * 0.6 : size;
  const height = shapeType === 3 ? size * 1.4 : size;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width,
        height,
        backgroundColor: color,
        borderRadius,
        bottom: '15%',
        left: '50%',
        transform: [
          {translateX},
          {translateY},
          {rotate: rotate.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '360deg'],
          })},
          {scale},
        ],
        opacity,
      }}
    />
  );
};

export const LevelUpOverlay: React.FC = () => {
  const {isVisible, levelUpData, hideLevelUp} = useLevelUpStore();
  const {colors, isDark} = useThemeColors();

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Level scroll animation
  const oldLevelY = useRef(new Animated.Value(0)).current;
  const newLevelY = useRef(new Animated.Value(60)).current;
  const oldLevelOpacity = useRef(new Animated.Value(1)).current;
  const newLevelOpacity = useRef(new Animated.Value(0)).current;

  // Progress bar
  const progressWidth = useRef(new Animated.Value(0)).current;

  // Credits
  const creditsScale = useRef(new Animated.Value(0)).current;
  const creditsOpacity = useRef(new Animated.Value(0)).current;

  // Button
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  const isClosingRef = useRef(false);

  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      hideLevelUp();
      isClosingRef.current = false;
    });
  }, [hideLevelUp, opacityAnim, scaleAnim]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isVisible && levelUpData) {
      isClosingRef.current = false;

      // Reset all animations
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      oldLevelY.setValue(0);
      newLevelY.setValue(60);
      oldLevelOpacity.setValue(1);
      newLevelOpacity.setValue(0);
      progressWidth.setValue(0);
      creditsScale.setValue(0);
      creditsOpacity.setValue(0);
      buttonOpacity.setValue(0);

      // Phase 1: Show modal
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Phase 2: Level scroll animation
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(oldLevelY, {
              toValue: -60,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(oldLevelOpacity, {
              toValue: 0,
              duration: 350,
              useNativeDriver: true,
            }),
            Animated.timing(newLevelY, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(newLevelOpacity, {
              toValue: 1,
              duration: 350,
              delay: 150,
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Phase 3: Progress bar
            Animated.timing(progressWidth, {
              toValue: 100,
              duration: 600,
              useNativeDriver: false,
            }).start(() => {
              // Phase 4: Credits
              if (levelUpData.creditReward > 0) {
                Animated.parallel([
                  Animated.spring(creditsScale, {
                    toValue: 1,
                    friction: 6,
                    tension: 50,
                    useNativeDriver: true,
                  }),
                  Animated.timing(creditsOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                  }),
                ]).start();
              }

              // Phase 5: Button
              setTimeout(() => {
                Animated.timing(buttonOpacity, {
                  toValue: 1,
                  duration: 200,
                  useNativeDriver: true,
                }).start();
              }, 200);
            });
          });
        }, 400);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, levelUpData]);

  const particles = Array.from({length: 50}, (_, i) => i);

  return (
    <Animated.View
      style={[
        styles.absoluteContainer,
        {
          opacity: opacityAnim,
          transform: [{translateX: isVisible ? 0 : -10000}],
        },
      ]}
      pointerEvents={isVisible ? 'auto' : 'none'}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          {/* Confetti */}
          {isVisible && particles.map(i => <Particle key={i} index={i} startAnim={isVisible} />)}

          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.container,
                {
                  transform: [{scale: scaleAnim}],
                },
              ]}>
              {/* Gradient background */}
              <LinearGradient
                colors={isDark
                  ? ['#1a1a1a', '#2d1810', '#1a1a1a']
                  : ['#FFF5E6', '#FFECD2', '#FFE0BD']
                }
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.gradientBg}
              />

              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.headerTitle, {color: isDark ? '#FFD700' : '#FF6B00'}]}>
                  LEVEL UP!
                </Text>
              </View>

              {/* Level transition */}
              {levelUpData && (
                <View style={styles.levelContainer}>
                  <View style={styles.levelScrollArea}>
                    {/* Old Level */}
                    <Animated.View
                      style={[
                        styles.levelItem,
                        {
                          transform: [{translateY: oldLevelY}],
                          opacity: oldLevelOpacity,
                        },
                      ]}>
                      <Text style={[styles.levelNumber, {color: isDark ? '#555' : '#999'}]}>
                        {levelUpData.oldLevel}
                      </Text>
                      <Text style={[styles.levelName, {color: isDark ? '#666' : '#888'}]}>
                        {levelUpData.oldLevelInfo.name}
                      </Text>
                    </Animated.View>

                    {/* New Level */}
                    <Animated.View
                      style={[
                        styles.levelItem,
                        {
                          transform: [{translateY: newLevelY}],
                          opacity: newLevelOpacity,
                        },
                      ]}>
                      <Text style={styles.levelNumberNew}>{levelUpData.newLevel}</Text>
                      <Text style={[styles.levelNameNew, {color: colors.text}]}>{levelUpData.newLevelInfo.name}</Text>
                    </Animated.View>
                  </View>
                </View>
              )}

              {/* Progress bar */}
              <View style={styles.progressContainer}>
                <View style={[styles.progressBg, {backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}]}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressWidth.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}>
                    <LinearGradient
                      colors={[COLORS.primary, '#FFD700']}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 0}}
                      style={styles.progressGradient}
                    />
                  </Animated.View>
                </View>
                <Text style={[styles.progressText, {color: colors.text}]}>
                  Livello completato!
                </Text>
              </View>

              {/* Credits reward */}
              {levelUpData && levelUpData.creditReward > 0 && (
                <Animated.View
                  style={[
                    styles.creditsContainer,
                    {
                      transform: [{scale: creditsScale}],
                      opacity: creditsOpacity,
                    },
                  ]}>
                  <View style={styles.creditsBadge}>
                    <Ionicons name="gift" size={20} color={COLORS.primary} />
                    <Text style={styles.creditsText}>+{levelUpData.creditReward} CREDITI</Text>
                  </View>
                </Animated.View>
              )}

              {/* Close button */}
              <Animated.View style={[styles.buttonContainer, {opacity: buttonOpacity}]}>
                <TouchableOpacity
                  style={styles.claimButton}
                  onPress={handleClose}
                  activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#FF6B00', '#FF8C00', '#FFB366']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.claimButtonGradient}>
                    <Text style={styles.claimButtonText}>CONTINUA</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  absoluteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 340,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: '#FF6B00',
    overflow: 'hidden',
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textShadowColor: 'rgba(255, 107, 0, 0.4)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 10,
    letterSpacing: 2,
  },
  levelContainer: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  levelScrollArea: {
    height: 110,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  levelItem: {
    position: 'absolute',
    alignItems: 'center',
  },
  levelNumber: {
    fontSize: 48,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  levelName: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    marginTop: 2,
  },
  levelNumberNew: {
    fontSize: 56,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  levelNameNew: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: 2,
  },
  progressContainer: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  progressBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
  },
  progressText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
    marginTop: 6,
  },
  creditsContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.primary,
    gap: 8,
  },
  creditsText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    letterSpacing: 1,
  },
  buttonContainer: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  claimButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  claimButtonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    minHeight: Platform.OS === 'ios' ? 52 : 48,
  },
  claimButtonText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#fff',
    letterSpacing: 2,
  },
});

export default LevelUpOverlay;
