import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {ScreenContainer, Button} from '../../components/common';
import {useAuthStore} from '../../store';
import {COLORS, SPACING, FONT_SIZE, FONT_WEIGHT} from '../../utils/constants';

interface EmailVerificationScreenProps {
  navigation: any;
  route: {
    params?: {
      email?: string;
      token?: string;
    };
  };
}

export const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({
  navigation,
  route,
}) => {
  const email = route.params?.email || useAuthStore.getState().pendingVerificationEmail || '';
  const token = route.params?.token;
  const {verifyEmail, resendVerificationEmail, clearPendingVerification, isLoading} = useAuthStore();
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [verifying, setVerifying] = useState(false);

  // Auto-verify when token is received via deep link
  useEffect(() => {
    if (token && !verifying) {
      setVerifying(true);
      verifyEmail(token)
        .then(() => {
          Alert.alert(
            'Email Verificata!',
            'Il tuo account è stato verificato con successo.',
          );
        })
        .catch((error: any) => {
          Alert.alert(
            'Errore di Verifica',
            error.message || 'Impossibile verificare l\'email. Riprova.',
          );
          setVerifying(false);
        });
    }
  }, [token, verifyEmail, verifying]);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;

    try {
      await resendVerificationEmail(email);
      setResendCount(resendCount + 1);
      setResendCooldown(60); // 60 seconds cooldown
      Alert.alert(
        'Email Inviata',
        'Abbiamo inviato un nuovo link di verifica al tuo indirizzo email.'
      );
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile inviare l\'email');
    }
  };

  const handleBackToLogin = () => {
    clearPendingVerification();
    // Navigate back to login screen
    navigation.reset({
      index: 0,
      routes: [{name: 'Login'}],
    });
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToLogin}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        {/* Email Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={60} color={COLORS.primary} />
          </View>
          <View style={styles.badgeContainer}>
            <Ionicons name="time-outline" size={24} color={COLORS.white} />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Verifica la tua Email</Text>
          <Text style={styles.subtitle}>
            Abbiamo inviato un link di verifica a:
          </Text>
          <Text style={styles.email}>{email}</Text>

          <View style={styles.instructionsContainer}>
            <View style={styles.instructionItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.instructionText}>
                Controlla la tua casella di posta (anche lo spam)
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.instructionText}>
                Clicca sul link "Verifica Email" nell'email
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.instructionText}>
                Torna qui e inizia a vincere premi!
              </Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Il link scade tra 24 ore. Verifica il tuo account per sbloccare tutte le funzionalita.
            </Text>
          </View>
        </View>

        <View style={styles.buttonsContainer}>
          <Button
            title={
              resendCooldown > 0
                ? `Reinvia tra ${resendCooldown}s`
                : 'Reinvia Email'
            }
            onPress={handleResendEmail}
            loading={isLoading}
            disabled={resendCooldown > 0}
            variant="outline"
            fullWidth
            size="large"
          />


          {resendCount >= 2 && (
            <View style={styles.helpContainer}>
              <Text style={styles.helpText}>
                Non ricevi l'email?{' '}
                <Text style={styles.helpLink}>Contatta il supporto</Text>
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: SPACING.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: SPACING.lg,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    position: 'relative',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 0,
    right: '32%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  email: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
    marginBottom: SPACING.xl,
  },
  instructionsContainer: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  stepNumberText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  instructionText: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    lineHeight: 22,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    borderRadius: 12,
    padding: SPACING.md,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
    lineHeight: 20,
  },
  buttonsContainer: {
    marginTop: SPACING.lg,
  },
  helpContainer: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  helpText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  helpLink: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
  },
});

export default EmailVerificationScreen;
