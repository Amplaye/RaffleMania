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
import {useAuthStore} from '../../store';

const {width, height} = Dimensions.get('window');

// Theme Colors
const COLORS = {
  background: '#FFFFFF',
  orange: '#FF6B00',
  orangeLight: '#FF8533',
  orangeDark: '#E55A00',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#E5E5E5',
  inputBg: '#FAFAFA',
  error: '#E53935',
  success: '#00B894',
};

// Neon glow effect
const NEON_GLOW = {
  shadowColor: '#FF6B00',
  shadowOffset: {width: 0, height: 4},
  shadowOpacity: 0.4,
  shadowRadius: 12,
  elevation: 8,
};

// Neon orange color
const NEON_ORANGE = '#FF6B00';

// Simple floating particle - bottom to top with slight blur
interface ParticleProps {
  delay: number;
  startX: number;
  size: number;
}

const FloatingParticle: React.FC<ParticleProps> = ({
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
  }, [delay]);

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

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  const {login, loginWithGoogle, loginWithApple, isLoading} = useAuthStore();
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  // Generate simple neon orange particles
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
  }, []);

  const validate = () => {
    const newErrors: {email?: string; password?: string} = {};
    if (!email.trim()) {
      newErrors.email = 'Email richiesta';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email non valida';
    }
    if (!password) {
      newErrors.password = 'Password richiesta';
    } else if (password.length < 6) {
      newErrors.password = 'Minimo 6 caratteri';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Errore durante il login');
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading('google');
    try {
      await loginWithGoogle();
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Errore durante il login con Google');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleLogin = async () => {
    setSocialLoading('apple');
    try {
      await loginWithApple();
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Errore durante il login con Apple');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGuestLogin = async () => {
    try {
      await login('guest@rafflemania.com', 'guest123');
    } catch (error: any) {
      Alert.alert('Errore', "Errore durante l'accesso come ospite");
    }
  };

  return (
    <LinearGradient
      colors={['#FFFFFF', '#FFFCF5', '#FFF8EE', '#FFF0E0', '#FFE8D0']}
      locations={[0, 0.25, 0.5, 0.75, 1]}
      start={{x: 0.5, y: 0}}
      end={{x: 0.5, y: 1}}
      style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Animated Background - Neon Orange Particles */}
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
              {/* Logo Section */}
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
                    colors={[COLORS.orange, COLORS.orangeLight]}
                    style={styles.logoIconGradient}>
                    <Ionicons name="gift" size={32} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <Text style={styles.logoText}>
                  <Text style={styles.logoRaffle}>Raffle</Text>
                  <Text style={styles.logoMania}>Mania</Text>
                </Text>
                <Text style={styles.tagline}>Guarda, gioca, vinci.</Text>
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

                {/* Email Input */}
                <View style={styles.inputWrapper}>
                  <View
                    style={[
                      styles.inputContainer,
                      errors.email && styles.inputContainerError,
                    ]}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={COLORS.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      placeholderTextColor={COLORS.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  {errors.email && (
                    <Text style={styles.errorText}>{errors.email}</Text>
                  )}
                </View>

                {/* Password Input */}
                <View style={styles.inputWrapper}>
                  <View
                    style={[
                      styles.inputContainer,
                      errors.password && styles.inputContainerError,
                    ]}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={COLORS.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor={COLORS.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                      hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                      activeOpacity={0.7}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={COLORS.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.password && (
                    <Text style={styles.errorText}>{errors.password}</Text>
                  )}
                </View>

                {/* Forgot Password */}
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>Password dimenticata?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                  style={[styles.loginButton, NEON_GLOW]}
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.85}>
                  <LinearGradient
                    colors={[COLORS.orange, COLORS.orangeDark]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.loginButtonGradient}>
                    {isLoading ? (
                      <Text style={styles.loginButtonText}>Accesso...</Text>
                    ) : (
                      <>
                        <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.loginButtonText}>Accedi</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>oppure</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Social Buttons - Inline */}
                <View style={styles.socialButtonsRow}>
                  {/* Google Button */}
                  <TouchableOpacity
                    style={styles.socialButtonSquare}
                    onPress={handleGoogleLogin}
                    disabled={socialLoading !== null}
                    activeOpacity={0.8}>
                    <View style={styles.googleIconContainer}>
                      <Text style={styles.googleIconG}>G</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Apple Button */}
                  <TouchableOpacity
                    style={[styles.socialButtonSquare, styles.appleButton]}
                    onPress={handleAppleLogin}
                    disabled={socialLoading !== null}
                    activeOpacity={0.8}>
                    <Ionicons name="logo-apple" size={24} color="#FFFFFF" />
                  </TouchableOpacity>

                  {/* Guest Button */}
                  <TouchableOpacity
                    style={styles.guestButton}
                    onPress={handleGuestLogin}
                    disabled={socialLoading !== null}
                    activeOpacity={0.8}>
                    <LinearGradient
                      colors={[COLORS.orange, COLORS.orangeDark]}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 1}}
                      style={styles.guestButtonGradient}>
                      <Ionicons name="person" size={22} color="#FFFFFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </Animated.View>

              {/* Register Link */}
              <Animated.View style={[styles.registerSection, {opacity: fadeAnim}]}>
                <Text style={styles.registerText}>Non hai un account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.registerLink}>Registrati</Text>
                </TouchableOpacity>
              </Animated.View>
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
    backgroundColor: '#FF6B00',
    // Neon glow effect with gaussian blur simulation
    shadowColor: '#FF6B00',
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
    shadowColor: COLORS.orange,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    fontSize: 38,
    fontWeight: '700',
  },
  logoRaffle: {
    color: COLORS.text,
  },
  logoMania: {
    color: COLORS.orange,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontWeight: '400',
  },
  formSection: {
    marginBottom: 24,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.orange + '40',
    paddingHorizontal: 16,
  },
  inputContainerFocused: {
    borderColor: COLORS.orange,
    backgroundColor: '#FFFFFF',
    shadowColor: COLORS.orange,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  inputContainerError: {
    borderColor: COLORS.error,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  eyeButton: {
    padding: 8,
    marginLeft: 4,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: COLORS.orange,
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginHorizontal: 16,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButtonSquare: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#FF6B00',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  guestButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.orange,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  guestButtonGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  googleIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIconG: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  registerText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  registerLink: {
    color: COLORS.orange,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default LoginScreen;
