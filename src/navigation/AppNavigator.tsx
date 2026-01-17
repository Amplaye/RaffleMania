import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator, NativeStackScreenProps} from '@react-navigation/native-stack';
import {View, Text, StyleSheet, StatusBar, Platform} from 'react-native';
import {useAuthStore} from '../store';
import {useThemeColors} from '../hooks/useThemeColors';
import {AuthNavigator} from './AuthNavigator';
import {TabNavigator} from './TabNavigator';
import {COLORS, FONT_SIZE, FONT_WEIGHT} from '../utils/constants';
import {ScreenContainer, Button} from '../components/common';

// Import actual screens
import {CreditsScreen} from '../screens/credits';
import {MyWinsScreen} from '../screens/mywins';
import {ReferralScreen} from '../screens/referral';
import {AddressFormScreen} from '../screens/address';
import {SettingsScreen} from '../screens/settings';
import {TicketDetailScreen} from '../screens/ticketdetail';
import {LevelDetailScreen} from '../screens/leveldetail';

// Stack param list
export type RootStackParamList = {
  MainTabs: undefined;
  TicketDetail: {ticketId: string};
  PrizeDetail: {prizeId: string};
  Credits: undefined;
  Winners: undefined;
  Referral: undefined;
  Settings: undefined;
  AddressForm: undefined;
  MyWins: undefined;
  LevelDetail: undefined;
};

type PlaceholderProps = NativeStackScreenProps<RootStackParamList, keyof RootStackParamList>;

// Placeholder for screens still in development
const PlaceholderScreen: React.FC<{title: string} & PlaceholderProps> = ({
  title,
  navigation,
}) => (
  <ScreenContainer>
    <View style={placeholderStyles.container}>
      <Text style={placeholderStyles.title}>{title}</Text>
      <Text style={placeholderStyles.subtitle}>Questa schermata e in sviluppo</Text>
      <Button
        title="Torna Indietro"
        onPress={() => navigation.goBack()}
        variant="outline"
      />
    </View>
  </ScreenContainer>
);

// Placeholder for screens not yet implemented
const PrizeDetailScreen = (props: NativeStackScreenProps<RootStackParamList, 'PrizeDetail'>) => (
  <PlaceholderScreen title="Dettaglio Premio" {...props} />
);
const WinnersScreen = (props: NativeStackScreenProps<RootStackParamList, 'Winners'>) => (
  <PlaceholderScreen title="Tutti i Vincitori" {...props} />
);

const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
});

const Stack = createNativeStackNavigator<RootStackParamList>();

const MainStack: React.FC = () => {
  const {colors} = useThemeColors();

  // Get status bar height for Android (the status bar is translucent in ScreenContainer)
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="TicketDetail"
        component={TicketDetailScreen}
        options={{title: 'Dettaglio Biglietto'}}
      />
      <Stack.Screen
        name="PrizeDetail"
        component={PrizeDetailScreen}
        options={{title: 'Dettaglio Premio'}}
      />
      <Stack.Screen
        name="Credits"
        component={CreditsScreen}
        options={{title: 'I Miei Crediti'}}
      />
      <Stack.Screen
        name="Winners"
        component={WinnersScreen}
        options={{title: 'Vincitori'}}
      />
      <Stack.Screen
        name="Referral"
        component={ReferralScreen}
        options={{title: 'Invita Amici'}}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{title: 'Impostazioni'}}
      />
      <Stack.Screen
        name="AddressForm"
        component={AddressFormScreen}
        options={{title: 'Indirizzo'}}
      />
      <Stack.Screen
        name="MyWins"
        component={MyWinsScreen}
        options={{title: 'Le Mie Vincite'}}
      />
      <Stack.Screen
        name="LevelDetail"
        component={LevelDetailScreen}
        options={{title: 'Sistema Livelli'}}
      />
    </Stack.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const {isAuthenticated} = useAuthStore();

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthNavigator />}
    </NavigationContainer>
  );
};
