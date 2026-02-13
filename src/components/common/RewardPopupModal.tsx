import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet, Modal, Animated, TouchableOpacity, Dimensions} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {FONT_WEIGHT, FONT_SIZE, RADIUS, SPACING, COLORS} from '../../utils/constants';
import {useThemeColors} from '../../hooks/useThemeColors';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

export interface RewardNotification {
  id: number;
  reason: string;
  credits: number;
  xp: number;
  tickets: number;
  createdAt: string;
}

interface RewardPopupModalProps {
  visible: boolean;
  reward: RewardNotification | null;
  onClose: () => void;
}

export const RewardPopupModal: React.FC<RewardPopupModalProps> = ({
  visible,
  reward,
  onClose,
}) => {
  const {colors, isDark} = useThemeColors();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      bounceAnim.setValue(0);
      shineAnim.setValue(0);

      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Gift icon bounce
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -15,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(bounceAnim, {
            toValue: 0,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
          }),
        ]).start();

        // Shine effect
        Animated.loop(
          Animated.timing(shineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ).start();
      });
    }
  }, [visible, scaleAnim, opacityAnim, bounceAnim, shineAnim]);

  const handleClose = () => {
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
      onClose();
    });
  };

  if (!reward) return null;

  const rewardItems: {icon: string; label: string; value: number; color: string}[] = [];
  if (reward.credits > 0) {
    rewardItems.push({icon: 'wallet-outline', label: 'Crediti', value: reward.credits, color: '#FF6B00'});
  }
  if (reward.xp > 0) {
    rewardItems.push({icon: 'flash-outline', label: 'XP', value: reward.xp, color: '#4ECDC4'});
  }
  if (reward.tickets > 0) {
    rewardItems.push({icon: 'ticket-outline', label: 'Biglietti', value: reward.tickets, color: '#9B59B6'});
  }

  const shineTranslateX = shineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent>
      <Animated.View style={[styles.overlay, {opacity: opacityAnim}]}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{scale: scaleAnim}],
            },
          ]}>
          {/* Header Gradient */}
          <LinearGradient
            colors={['#FF6B00', '#FF8F40', '#FFB366']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.header}>
            {/* Shine effect */}
            <Animated.View
              style={[
                styles.shine,
                {transform: [{translateX: shineTranslateX}]},
              ]}
            />

            {/* Gift Icon */}
            <Animated.View
              style={[
                styles.giftIconContainer,
                {transform: [{translateY: bounceAnim}]},
              ]}>
              <View style={styles.giftIconCircle}>
                <Ionicons name="gift" size={40} color="#FF6B00" />
              </View>
            </Animated.View>

            <Text style={styles.headerTitle}>Ricompensa Ricevuta!</Text>
          </LinearGradient>

          {/* Content */}
          <View style={[styles.content, {backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF'}]}>
            {/* Reason */}
            <Text style={[styles.reasonText, {color: colors.text}]}>
              {reward.reason}
            </Text>

            {/* Reward Items */}
            <View style={styles.rewardItemsContainer}>
              {rewardItems.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.rewardItem,
                    {backgroundColor: isDark ? '#252540' : '#F8F9FA'},
                  ]}>
                  <View style={[styles.rewardIconCircle, {backgroundColor: item.color + '20'}]}>
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  <Text style={[styles.rewardValue, {color: item.color}]}>
                    +{item.value.toLocaleString('it-IT')}
                  </Text>
                  <Text style={[styles.rewardLabel, {color: colors.textSecondary || '#888'}]}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.8}>
              <LinearGradient
                colors={['#FF6B00', '#FF8533']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.closeButtonGradient}>
                <Text style={styles.closeButtonText}>Fantastico!</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  container: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 380,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#FF6B00',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  header: {
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 80,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{skewX: '-20deg'}],
  },
  giftIconContainer: {
    marginBottom: 12,
  },
  giftIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  reasonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  rewardItemsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  rewardItem: {
    alignItems: 'center',
    padding: 16,
    borderRadius: RADIUS.lg,
    minWidth: 90,
  },
  rewardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardValue: {
    fontSize: 20,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: 2,
  },
  rewardLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  closeButton: {
    width: '100%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  closeButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
  },
  closeButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
  },
});

export default RewardPopupModal;
