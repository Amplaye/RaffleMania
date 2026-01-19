import React, {useEffect, useRef, useMemo} from 'react';
import {View, Text, StyleSheet, Animated, Modal, TouchableOpacity, Image, Dimensions, Easing} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {FONT_FAMILY, FONT_WEIGHT, FONT_SIZE, RADIUS, SPACING, COLORS} from '../../utils/constants';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// Confetti colors
const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE'];

// Single confetti piece component
interface ConfettiPieceProps {
  index: number;
  animValue: Animated.Value;
}

const ConfettiPiece: React.FC<ConfettiPieceProps> = ({index, animValue}) => {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const startX = useMemo(() => Math.random() * SCREEN_WIDTH, []);
  const size = useMemo(() => 8 + Math.random() * 8, []);
  const rotation = useMemo(() => Math.random() * 360, []);
  const swayAmount = useMemo(() => 30 + Math.random() * 40, []);
  const delay = useMemo(() => Math.random() * 0.3, []);
  const isCircle = useMemo(() => Math.random() > 0.5, []);

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, SCREEN_HEIGHT + 100],
  });

  const translateX = animValue.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, swayAmount, 0, -swayAmount, 0],
  });

  const rotate = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [`${rotation}deg`, `${rotation + 720}deg`],
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          left: startX,
          width: size,
          height: isCircle ? size : size * 2,
          backgroundColor: color,
          borderRadius: isCircle ? size / 2 : 2,
          transform: [{translateY}, {translateX}, {rotate}],
          opacity,
        },
      ]}
    />
  );
};

// Confetti container
interface ConfettiProps {
  isActive: boolean;
}

const Confetti: React.FC<ConfettiProps> = ({isActive}) => {
  const confettiAnims = useRef(
    Array.from({length: 30}, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (isActive) {
      // Start confetti animations with staggered delays
      confettiAnims.forEach((anim, index) => {
        anim.setValue(0);
        Animated.loop(
          Animated.timing(anim, {
            toValue: 1,
            duration: 2500 + Math.random() * 1000,
            delay: index * 100,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ).start();
      });
    } else {
      confettiAnims.forEach(anim => anim.stopAnimation());
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <View style={styles.confettiContainer} pointerEvents="none">
      {confettiAnims.map((anim, index) => (
        <ConfettiPiece key={index} index={index} animValue={anim} />
      ))}
    </View>
  );
};

interface ExtractionResultModalProps {
  visible: boolean;
  isWinner: boolean;
  prizeName?: string;
  prizeImage?: string;
  ticketCode?: string;
  onClose: () => void;
}

export const ExtractionResultModal: React.FC<ExtractionResultModalProps> = ({
  visible,
  isWinner,
  prizeName,
  prizeImage,
  ticketCode,
  onClose,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
      iconScaleAnim.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.spring(iconScaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }).start();

        if (isWinner) {
          Animated.loop(
            Animated.timing(confettiAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
          ).start();
        }
      });
    }
  }, [visible, isWinner]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Confetti Effect for Winner */}
      {isWinner && <Confetti isActive={visible && isWinner} />}

      <Animated.View style={[styles.overlay, {opacity: opacityAnim}]}>
        <Animated.View style={[styles.container, {transform: [{scale: scaleAnim}]}]}>
          {isWinner ? (
            // Winner Modal
            <LinearGradient
              colors={['#FFD700', '#FFA500', '#FF8C00']}
              style={styles.winnerGradient}>
              <View style={styles.winnerContent}>
                {/* Congratulations Text */}
                <Text style={styles.winnerTitle}>CONGRATULAZIONI</Text>
                <Text style={styles.winnerSubtitle}>Hai vinto!</Text>

                {/* Prize Image - Much Larger */}
                {prizeImage && (
                  <View style={styles.prizeImageContainer}>
                    <Image source={{uri: prizeImage}} style={styles.prizeImage} resizeMode="contain" />
                  </View>
                )}

                <Text style={styles.prizeName}>{prizeName}</Text>

                {ticketCode && (
                  <View style={styles.ticketCodeContainer}>
                    <Text style={styles.ticketCodeLabel}>Biglietto Vincente</Text>
                    <Text style={styles.ticketCode}>{ticketCode}</Text>
                  </View>
                )}

                {/* Close Button */}
                <TouchableOpacity style={styles.winnerButton} onPress={onClose}>
                  <Text style={styles.winnerButtonText}>Fantastico!</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          ) : (
            // Loser Modal
            <View style={styles.loserContainer}>
              {/* Sad Icon */}
              <Animated.View style={[styles.iconContainer, {transform: [{scale: iconScaleAnim}]}]}>
                <View style={styles.sadCircle}>
                  <Ionicons name="sad-outline" size={50} color="#888" />
                </View>
              </Animated.View>

              {/* Message */}
              <Text style={styles.loserTitle}>Peccato!</Text>
              <Text style={styles.loserSubtitle}>Non hai vinto questa volta</Text>

              {/* Encouragement */}
              <View style={styles.encouragementBox}>
                <Ionicons name="flash" size={24} color={COLORS.primary} />
                <Text style={styles.encouragementText}>
                  Non arrenderti! Continua a partecipare per aumentare le tue possibilità di vincita.
                </Text>
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.statText}>Prossima estrazione presto</Text>
                </View>
              </View>

              {/* Close Button */}
              <TouchableOpacity style={styles.loserButton} onPress={onClose}>
                <LinearGradient
                  colors={[COLORS.primary, '#FF8500']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.loserButtonGradient}>
                  <View style={styles.loserButtonContent}>
                    <Text style={styles.loserButtonText}>Riprova</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  confettiPiece: {
    position: 'absolute',
    top: 0,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    zIndex: 1001,
  },
  // Winner Styles
  winnerGradient: {
    borderRadius: RADIUS.xl,
  },
  winnerContent: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: SPACING.md,
  },
  winnerTitle: {
    fontSize: 26,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  winnerSubtitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.medium,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: SPACING.md,
  },
  prizeImageContainer: {
    width: 240,
    height: 240,
    marginBottom: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prizeImage: {
    width: '100%',
    height: '100%',
  },
  prizeName: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  ticketCodeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  ticketCodeLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  ticketCode: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
  },
  winnerButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  winnerButtonText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FF8C00',
  },
  // Loser Styles
  loserContainer: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.xl,
    alignItems: 'center',
  },
  sadCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loserTitle: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#333',
  },
  loserSubtitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    color: '#888',
    marginBottom: SPACING.lg,
  },
  encouragementBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}10`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    gap: 12,
  },
  encouragementText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: '#555',
    lineHeight: 20,
  },
  statsRow: {
    marginBottom: SPACING.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    color: '#666',
  },
  loserButton: {
    width: '100%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  loserButtonGradient: {
    borderRadius: RADIUS.lg,
  },
  loserButtonContent: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  loserButtonText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
  },
});

export default ExtractionResultModal;
