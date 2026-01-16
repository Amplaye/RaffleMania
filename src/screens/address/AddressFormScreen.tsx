import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {ScreenContainer} from '../../components/common';
import {useAuthStore} from '../../store';
import {useThemeColors} from '../../hooks/useThemeColors';
import {ShippingAddress} from '../../types';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';

interface AddressFormScreenProps {
  navigation: any;
}

export const AddressFormScreen: React.FC<AddressFormScreenProps> = ({navigation}) => {
  const {colors} = useThemeColors();
  const {user, updateUser} = useAuthStore();
  const existingAddress = user?.shippingAddress;

  const [formData, setFormData] = useState<ShippingAddress>({
    fullName: existingAddress?.fullName || '',
    street: existingAddress?.street || '',
    city: existingAddress?.city || '',
    province: existingAddress?.province || '',
    postalCode: existingAddress?.postalCode || '',
    phone: existingAddress?.phone || '',
  });

  const [errors, setErrors] = useState<Partial<ShippingAddress>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<ShippingAddress> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Nome completo richiesto';
    }
    if (!formData.street.trim()) {
      newErrors.street = 'Indirizzo richiesto';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'Citta richiesta';
    }
    if (!formData.province.trim()) {
      newErrors.province = 'Provincia richiesta';
    }
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'CAP richiesto';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefono richiesto';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      updateUser({shippingAddress: formData});
      Alert.alert('Salvato!', 'Indirizzo di spedizione aggiornato.', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    }
  };

  const renderInput = (
    label: string,
    field: keyof ShippingAddress,
    placeholder: string,
    keyboardType: 'default' | 'phone-pad' | 'numeric' = 'default',
  ) => (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, {color: colors.text}]}>{label}</Text>
      <TextInput
        style={[styles.input, {backgroundColor: colors.card, borderColor: colors.border, color: colors.text}, errors[field] && {borderColor: colors.error}]}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={formData[field]}
        onChangeText={text => {
          setFormData({...formData, [field]: text});
          if (errors[field]) {
            setErrors({...errors, [field]: undefined});
          }
        }}
        keyboardType={keyboardType}
      />
      {errors[field] && <Text style={[styles.errorText, {color: colors.error}]}>{errors[field]}</Text>}
    </View>
  );

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Info Banner */}
          <View style={[styles.infoBanner, {backgroundColor: `${colors.primary}10`}]}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={[styles.infoText, {color: colors.text}]}>
              Questo indirizzo verra utilizzato per la spedizione dei premi vinti.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {renderInput('Nome completo', 'fullName', 'Mario Rossi')}
            {renderInput('Indirizzo', 'street', 'Via Roma 123')}

            <View style={styles.row}>
              <View style={styles.rowItem}>
                {renderInput('Citta', 'city', 'Milano')}
              </View>
              <View style={styles.rowItem}>
                {renderInput('Provincia', 'province', 'MI')}
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                {renderInput('CAP', 'postalCode', '20100', 'numeric')}
              </View>
              <View style={styles.rowItem}>
                {renderInput('Telefono', 'phone', '+39 333 1234567', 'phone-pad')}
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <LinearGradient
              colors={[COLORS.primary, '#FF8500']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.saveButtonGradient}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
              <Text style={styles.saveButtonText}>Salva indirizzo</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text,
  },
  form: {
    marginBottom: SPACING.lg,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.error,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  rowItem: {
    flex: 1,
  },
  saveButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: SPACING.sm,
  },
  saveButtonText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
});

export default AddressFormScreen;
