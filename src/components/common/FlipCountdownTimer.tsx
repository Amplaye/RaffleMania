import React, {useEffect, useRef, useState, memo} from 'react';
import {View, Text, StyleSheet, Animated} from 'react-native';
import {FONT_FAMILY, FONT_WEIGHT} from '../../utils/constants';

interface FlipCountdownTimerProps {
  seconds: number;
  isVisible: boolean;
  isUrgent?: boolean;
  isBettingLocked?: boolean;
}

// Slide digit card component with horizontal slide animation
const SlideDigitCard = memo(({digit, isUrgent, prevDigit}: {digit: string; isUrgent: boolean; prevDigit: string}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const textColor = isUrgent ? '#FF4444' : '#FFFFFF';

  useEffect(() => {
    if (digit !== prevDigit) {
      slideAnim.setValue(1);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [digit, prevDigit]);

  // New digit slides in from right
  const newTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, CARD_SIZE],
  });

  // Old digit slides out to left
  const oldTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-CARD_SIZE, 0],
  });

  const newOpacity = slideAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.5, 0],
  });

  const oldOpacity = slideAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });

  return (
    <View style={styles.digitCard}>
      {/* Static background */}
      <View style={styles.digitCardInner}>
        {/* Current digit (slides in from right) */}
        <Animated.Text
          style={[
            styles.digitText,
            {
              color: textColor,
              opacity: newOpacity,
              transform: [{translateX: newTranslateX}],
            },
          ]}>
          {digit}
        </Animated.Text>
      </View>

      {/* Previous digit (slides out to left) */}
      <Animated.View
        style={[
          styles.oldDigitOverlay,
          {
            opacity: oldOpacity,
            transform: [{translateX: oldTranslateX}],
          },
        ]}>
        <Text style={[styles.digitText, {color: textColor}]}>{prevDigit}</Text>
      </Animated.View>

      {/* Center line for flip card look */}
      <View style={styles.digitCardLine} />
    </View>
  );
});

// Separator colon component
const Separator = memo(({isUrgent}: {isUrgent: boolean}) => {
  const dotColor = isUrgent ? '#FF4444' : '#FFFFFF';

  return (
    <View style={styles.separator}>
      <View style={[styles.separatorDot, {backgroundColor: dotColor}]} />
      <View style={[styles.separatorDot, {backgroundColor: dotColor}]} />
    </View>
  );
});

const CARD_SIZE = 36;
const CARD_HEIGHT = CARD_SIZE * 1.35;

export const FlipCountdownTimer: React.FC<FlipCountdownTimerProps> = ({
  seconds,
  isVisible,
  isUrgent = false,
  isBettingLocked = false,
}) => {
  const [time, setTime] = useState({hours: '00', minutes: '00', secs: '00'});
  const [prevTime, setPrevTime] = useState({hours: '00', minutes: '00', secs: '00'});
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Update time display
  useEffect(() => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const scs = seconds % 60;

    const newTime = {
      hours: hrs.toString().padStart(2, '0'),
      minutes: mins.toString().padStart(2, '0'),
      secs: scs.toString().padStart(2, '0'),
    };

    setPrevTime(time);
    setTime(newTime);
  }, [seconds]);

  // Pulse animation when urgent
  useEffect(() => {
    if (isUrgent && isVisible) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isUrgent, isVisible]);

  if (!isVisible) return null;

  // Last 30 seconds: show only seconds + "PUNTATE CHIUSE"
  if (isBettingLocked) {
    return (
      <Animated.View style={[styles.container, styles.lockedContainer, {transform: [{scale: pulseAnim}]}]}>
        <View style={styles.lockedRow}>
          {/* Large seconds display */}
          <View style={styles.digitGroup}>
            <SlideDigitCard digit={time.secs[0]} isUrgent={true} prevDigit={prevTime.secs[0]} />
            <SlideDigitCard digit={time.secs[1]} isUrgent={true} prevDigit={prevTime.secs[1]} />
          </View>

          {/* Locked badge inline */}
          <View style={styles.lockedBadgeInline}>
            <Text style={styles.lockedText}>PUNTATE CHIUSE</Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, {transform: [{scale: pulseAnim}]}]}>
      <View style={styles.timerRow}>
        {/* Hours */}
        <View style={styles.digitGroup}>
          <SlideDigitCard digit={time.hours[0]} isUrgent={isUrgent} prevDigit={prevTime.hours[0]} />
          <SlideDigitCard digit={time.hours[1]} isUrgent={isUrgent} prevDigit={prevTime.hours[1]} />
        </View>

        <Separator isUrgent={isUrgent} />

        {/* Minutes */}
        <View style={styles.digitGroup}>
          <SlideDigitCard digit={time.minutes[0]} isUrgent={isUrgent} prevDigit={prevTime.minutes[0]} />
          <SlideDigitCard digit={time.minutes[1]} isUrgent={isUrgent} prevDigit={prevTime.minutes[1]} />
        </View>

        <Separator isUrgent={isUrgent} />

        {/* Seconds */}
        <View style={styles.digitGroup}>
          <SlideDigitCard digit={time.secs[0]} isUrgent={isUrgent} prevDigit={prevTime.secs[0]} />
          <SlideDigitCard digit={time.secs[1]} isUrgent={isUrgent} prevDigit={prevTime.secs[1]} />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  lockedContainer: {
    paddingVertical: 2,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  digitGroup: {
    flexDirection: 'row',
    gap: 3,
  },
  digitCard: {
    width: CARD_SIZE,
    height: CARD_HEIGHT,
    backgroundColor: '#111111',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333333',
  },
  digitCardInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  digitCardLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#000000',
    zIndex: 10,
  },
  digitText: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  oldDigitOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  separator: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 8,
  },
  separatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  lockedBadgeInline: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FF4444',
    borderRadius: 6,
  },
  lockedText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

export default FlipCountdownTimer;
