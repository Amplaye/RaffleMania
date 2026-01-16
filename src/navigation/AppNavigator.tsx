import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator, NativeStackScreenProps} from '@react-navigation/native-stack';
import {useAuthStore} from '../store';
import {AuthNavigator} from './AuthNavigator';
import {TabNavigator} from './TabNavigator';
import {COLORS, FONT_SIZE, FONT_WEIGHT} from '../utils/constants';

// Placeholder screens for stack navigation
import {View, Text, StyleSheet} from 'react-native';
import {ScreenContainer, Button} from '../components/common';

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
};

type PlaceholderProps = NativeStackScreenProps<RootStackParamList, keyof RootStackParamList>;

// Placeholder screens
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

// Create typed placeholder components
const TicketDetailScreen = (props: NativeStackScreenProps<RootStackParamList, 'TicketDetail'>) => (
  <PlaceholderScreen title="Dettaglio Biglietto" {...props} />
);
const PrizeDetailScreen = (props: NativeStackScreenProps<RootStackParamList, 'PrizeDetail'>) => (
  <PlaceholderScreen title="Dettaglio Premio" {...props} />
);
const CreditsScreen = (props: NativeStackScreenProps<RootStackParamList, 'Credits'>) => (
  <PlaceholderScreen title="Acquista Crediti" {...props} />
);
const WinnersScreen = (props: NativeStackScreenProps<RootStackParamList, 'Winners'>) => (
  <PlaceholderScreen title="Tutti i Vincitori" {...props} />
);
const ReferralScreen = (props: NativeStackScreenProps<RootStackParamList, 'Referral'>) => (
  <PlaceholderScreen title="Programma Referral" {...props} />
);
const SettingsScreen = (props: NativeStackScreenProps<RootStackParamList, 'Settings'>) => (
  <PlaceholderScreen title="Impostazioni" {...props} />
);
const AddressFormScreen = (props: NativeStackScreenProps<RootStackParamList, 'AddressForm'>) => (
  <PlaceholderScreen title="Indirizzo di Spedizione" {...props} />
);
const MyWinsScreen = (props: NativeStackScreenProps<RootStackParamList, 'MyWins'>) => (
  <PlaceholderScreen title="I Miei Premi Vinti" {...props} />
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
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.surface,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: FONT_WEIGHT.semibold,
        },
        headerShadowVisible: false,
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
