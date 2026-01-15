import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAuthStore} from '../store';
import {AuthNavigator} from './AuthNavigator';
import {TabNavigator} from './TabNavigator';
import {COLORS, FONT_SIZE, FONT_WEIGHT} from '../utils/constants';

// Placeholder screens for stack navigation
import {View, Text, StyleSheet} from 'react-native';
import {ScreenContainer, Card, Button} from '../components/common';

// Placeholder screens
const PlaceholderScreen: React.FC<{title: string; navigation: any}> = ({
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
        options={{title: 'Dettaglio Biglietto'}}
        component={({navigation}) => (
          <PlaceholderScreen title="Dettaglio Biglietto" navigation={navigation} />
        )}
      />
      <Stack.Screen
        name="PrizeDetail"
        options={{title: 'Dettaglio Premio'}}
        component={({navigation}) => (
          <PlaceholderScreen title="Dettaglio Premio" navigation={navigation} />
        )}
      />
      <Stack.Screen
        name="Credits"
        options={{title: 'I Miei Crediti'}}
        component={({navigation}) => (
          <PlaceholderScreen title="Acquista Crediti" navigation={navigation} />
        )}
      />
      <Stack.Screen
        name="Winners"
        options={{title: 'Vincitori'}}
        component={({navigation}) => (
          <PlaceholderScreen title="Tutti i Vincitori" navigation={navigation} />
        )}
      />
      <Stack.Screen
        name="Referral"
        options={{title: 'Invita Amici'}}
        component={({navigation}) => (
          <PlaceholderScreen title="Programma Referral" navigation={navigation} />
        )}
      />
      <Stack.Screen
        name="Settings"
        options={{title: 'Impostazioni'}}
        component={({navigation}) => (
          <PlaceholderScreen title="Impostazioni" navigation={navigation} />
        )}
      />
      <Stack.Screen
        name="AddressForm"
        options={{title: 'Indirizzo'}}
        component={({navigation}) => (
          <PlaceholderScreen title="Indirizzo di Spedizione" navigation={navigation} />
        )}
      />
      <Stack.Screen
        name="MyWins"
        options={{title: 'Le Mie Vincite'}}
        component={({navigation}) => (
          <PlaceholderScreen title="I Miei Premi Vinti" navigation={navigation} />
        )}
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
