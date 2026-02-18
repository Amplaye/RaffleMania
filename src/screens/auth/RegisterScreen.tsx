import React, {useState, useRef} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Input, Button} from '../../components/common';
import {useAuthStore} from '../../store';
import {COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADIUS} from '../../utils/constants';
import {useThemeColors} from '../../hooks/useThemeColors';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {AnimatedBackground} from '../../components/common';

interface RegisterScreenProps {
  navigation: any;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({navigation}) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {register, isLoading} = useAuthStore();

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!displayName.trim()) {
      newErrors.displayName = 'Nome richiesto';
    } else if (displayName.trim().length < 2) {
      newErrors.displayName = 'Nome troppo corto';
    }

    if (!email.trim()) {
      newErrors.email = 'Email richiesta';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email non valida';
    }

    if (!password) {
      newErrors.password = 'Password richiesta';
    } else if (password.length < 6) {
      newErrors.password = 'Password minimo 6 caratteri';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Le password non coincidono';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      const result = await register(email, password, displayName, referralCode.trim() || undefined);
      // Navigate to email verification screen if required
      if (result?.requiresVerification) {
        navigation.navigate('EmailVerification', {email});
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Errore durante la registrazione';

      // Check if it's an invalid referral code error
      if (errorMessage.toLowerCase().includes('referral') || errorMessage.toLowerCase().includes('codice')) {
        setErrors(prev => ({...prev, referralCode: errorMessage}));
        Alert.alert(
          'Codice Referral Non Valido',
          'Il codice referral inserito non esiste. Verifica il codice e riprova, oppure lascia il campo vuoto per continuare senza referral.',
          [
            {text: 'Correggi', style: 'cancel'},
            {
              text: 'Continua senza',
              onPress: async () => {
                setReferralCode('');
                setErrors(prev => {
                  const {referralCode: _unused, ...rest} = prev;
                  void _unused;
                  return rest;
                });
                try {
                  const retryResult = await register(email, password, displayName, undefined);
                  if (retryResult?.requiresVerification) {
                    navigation.navigate('EmailVerification', {email});
                  }
                } catch (retryError: any) {
                  Alert.alert('Errore', retryError.message || 'Errore durante la registrazione');
                }
              },
            },
          ],
        );
      } else {
        Alert.alert('Errore', errorMessage);
      }
    }
  };

  const {gradientColors, isDark, colors} = useThemeColors();
  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <LinearGradient
      colors={gradientColors as unknown as string[]}
      locations={[0, 0.25, 0.5, 0.75, 1]}
      start={{x: 0.5, y: 0}}
      end={{x: 0.5, y: 1}}
      style={styles.gradient}>
      <AnimatedBackground />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.container}>
              {/* Back Button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>

              <View style={styles.header}>
                <Text style={[styles.title, {color: colors.text}]}>Crea Account</Text>
                <Text style={[styles.subtitle, {color: colors.textSecondary}]}>
                  Inizia a vincere premi incredibili!
                </Text>
              </View>

              <View style={styles.form}>
                <Input
                  label="Nome"
                  placeholder="Come ti chiami?"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  error={errors.displayName}
                />

                <Input
                  label="Email"
                  placeholder="La tua email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email}
                />

                <Input
                  label="Password"
                  placeholder="Crea una password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  error={errors.password}
                  rightIcon={
                    <Text style={styles.showHide}>
                      {showPassword ? 'Nascondi' : 'Mostra'}
                    </Text>
                  }
                  onRightIconPress={() => setShowPassword(!showPassword)}
                />

                <Input
                  label="Conferma Password"
                  placeholder="Ripeti la password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  error={errors.confirmPassword}
                />

                <Input
                  label="Codice Referral (opzionale)"
                  placeholder="Hai un codice amico?"
                  value={referralCode}
                  onChangeText={text => {
                    setReferralCode(text.toUpperCase());
                    if (errors.referralCode) {
                      setErrors(prev => {
                        const {referralCode: _unused, ...rest} = prev;
                        void _unused;
                        return rest;
                      });
                    }
                  }}
                  autoCapitalize="characters"
                  error={errors.referralCode}
                />

                <Button
                  title="Crea Account"
                  onPress={handleRegister}
                  loading={isLoading}
                  fullWidth
                  size="large"
                />
              </View>

              <View style={styles.footer}>
                <Text style={[styles.footerText, {color: colors.textSecondary}]}>Hai gia un account? </Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.footerLink}>Accedi</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.terms, {color: colors.textSecondary}]}>
                Registrandoti accetti i nostri{' '}
                <Text style={styles.link} onPress={() => navigation.navigate('Terms')}>Termini di Servizio</Text> e la{' '}
                <Text style={styles.link} onPress={() => navigation.navigate('PrivacyPolicy')}>Privacy Policy</Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.md,
  },
  container: {
    flex: 1,
    paddingVertical: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  header: {
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
  },
  form: {
    marginBottom: SPACING.lg,
  },
  showHide: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
  terms: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  link: {
    color: COLORS.primary,
  },
});

export default RegisterScreen;
