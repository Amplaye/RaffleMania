import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StatusBar,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useThemeColors} from '../../hooks/useThemeColors';

const {width, height} = Dimensions.get('window');

const BRAND = {
  orange: '#FF6B00',
  orangeLight: '#FF8533',
  orangeDark: '#E55A00',
  error: '#E53935',
};

const NEON_GLOW = Platform.select({
  ios: {
    shadowColor: BRAND.orange,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  android: {
    elevation: 8,
  },
}) as object;

interface ParticleProps {
  delay: number;
  startX: number;
  size: number;
}

const FloatingParticle: React.FC<ParticleProps> = ({delay, startX, size}) => {
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
          Animated.timing(translateY, {
            toValue: -100,
            duration,
            useNativeDriver: true,
          }),
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

interface ForgotPasswordScreenProps {
  navigation: any;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  navigation,
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {colors, gradientColors, isDark} = useThemeColors();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  const particles = useRef(
    Array.from({length: 15}, (_, i) => ({
      id: i,
      delay: i * 600,
      startX: Math.random() * width,
      size: 4 + Math.random() * 6,
    })),
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, logoScale]);

  const validate = () => {
    if (!email.trim()) {
      setError('Email richiesta');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email non valida');
      return false;
    }
    setError('');
    return true;
  };

  const handleResetPassword = async () => {
    if (!validate()) {
      return;
    }

    setIsLoading(true);
    try {
      // Simula invio email (sostituire con API reale)
      await new Promise<void>(resolve => setTimeout(resolve, 1500));
      setEmailSent(true);
    } catch (err: any) {
      Alert.alert('Errore', err.message || "Errore durante l'invio dell'email");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setIsLoading(true);
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 1500));
      Alert.alert('Fatto', 'Email inviata nuovamente!');
    } catch {
      Alert.alert('Errore', "Errore durante l'invio dell'email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={gradientColors as unknown as string[]}
      locations={[0, 0.25, 0.5, 0.75, 1]}
      start={{x: 0.5, y: 0}}
      end={{x: 0.5, y: 1}}
      style={styles.container}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.particlesContainer} pointerEvents="none">
        {particles.map(p => (
          <FloatingParticle
            key={p.id}
            delay={p.delay}
            startX={p.startX}
            size={p.size}
          />
        ))}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never">
          <View style={styles.content}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>

            {/* Icon Section */}
            <Animated.View
              style={[
                styles.logoSection,
                {
                  opacity: fadeAnim,
                  transform: [{translateY: slideAnim}, {scale: logoScale}],
                },
              ]}>
              <View style={styles.logoIconContainer}>
                <LinearGradient
                  colors={[BRAND.orange, BRAND.orangeLight]}
                  style={styles.logoIconGradient}>
                  <Ionicons
                    name={emailSent ? 'mail' : 'lock-open'}
                    size={32}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              </View>
              <Text style={[styles.title, {color: colors.text}]}>
                {emailSent ? 'Email Inviata!' : 'Password Dimenticata?'}
              </Text>
              <Text style={[styles.subtitle, {color: colors.textSecondary}]}>
                {emailSent
                  ? `Abbiamo inviato le istruzioni per reimpostare la password a ${email}`
                  : 'Inserisci la tua email e ti invieremo le istruzioni per reimpostare la password'}
              </Text>
            </Animated.View>

            {/* Form Section */}
            <Animated.View
              style={[
                styles.formSection,
                {
                  opacity: fadeAnim,
                  transform: [{translateY: slideAnim}],
                },
              ]}>
              {!emailSent ? (
                <>
                  {/* Email Input */}
                  <View style={styles.inputWrapper}>
                    <View
                      style={[
                        styles.inputContainer,
                        {backgroundColor: isDark ? colors.card : '#FAFAFA', borderColor: BRAND.orange + '40'},
                        error && styles.inputContainerError,
                      ]}>
                      <Ionicons
                        name="mail-outline"
                        size={20}
                        color={colors.textSecondary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, {color: colors.text}]}
                        placeholder="La tua email"
                        placeholderTextColor={colors.textSecondary}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    {error ? (
                      <Text style={styles.errorText}>{error}</Text>
                    ) : null}
                  </View>

                  {/* Reset Button */}
                  <TouchableOpacity
                    style={[styles.resetButton, NEON_GLOW]}
                    onPress={handleResetPassword}
                    disabled={isLoading}
                    activeOpacity={0.85}>
                    <LinearGradient
                      colors={[BRAND.orange, BRAND.orangeDark]}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 0}}
                      style={styles.resetButtonGradient}>
                      <Text style={styles.resetButtonText}>
                        {isLoading ? 'Invio...' : 'Invia Email'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Success State */}
                  <TouchableOpacity
                    style={[styles.resetButton, NEON_GLOW]}
                    onPress={() => navigation.navigate('Login')}
                    activeOpacity={0.85}>
                    <LinearGradient
                      colors={[BRAND.orange, BRAND.orangeDark]}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 0}}
                      style={styles.resetButtonGradient}>
                      <Ionicons
                        name="log-in-outline"
                        size={20}
                        color="#FFFFFF"
                      />
                      <Text style={styles.resetButtonText}>Torna al Login</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleResendEmail}
                    disabled={isLoading}
                    activeOpacity={0.7}>
                    <Text style={styles.resendButtonText}>
                      {isLoading ? 'Invio...' : "Non hai ricevuto l'email? Reinvia"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>

            {/* Back to Login Link */}
            {!emailSent && (
              <Animated.View style={[styles.loginSection, {opacity: fadeAnim}]}>
                <Text style={[styles.loginText, {color: colors.textSecondary}]}>Ricordi la password? </Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.loginLink}>Accedi</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  particle: {
    position: 'absolute',
    backgroundColor: BRAND.orange,
    shadowColor: BRAND.orange,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 28,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.orange,
    borderRadius: 12,
    zIndex: 10,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIconContainer: {
    marginBottom: 16,
  },
  logoIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND.orange,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  formSection: {
    marginBottom: 24,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    shadowColor: BRAND.orange,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  inputContainerError: {
    borderColor: BRAND.error,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },
  errorText: {
    color: BRAND.error,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  resetButton: {
    borderRadius: 14,
  },
  resetButtonGradient: {
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.OS === 'ios' ? 56 : 52,
    gap: 8,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  resendButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  resendButtonText: {
    color: BRAND.orange,
    fontSize: 14,
    fontWeight: '500',
  },
  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    fontSize: 15,
  },
  loginLink: {
    color: BRAND.orange,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;
