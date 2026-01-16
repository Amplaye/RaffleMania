import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View, Text, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {HomeScreen} from '../screens/home';
import {TicketsScreen} from '../screens/tickets';
import {PrizesScreen} from '../screens/prizes';
import {ProfileScreen} from '../screens/profile';
import {COLORS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY} from '../utils/constants';

export type TabParamList = {
  Home: undefined;
  Tickets: undefined;
  Prizes: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

interface TabIconProps {
  focused: boolean;
  iconName: string;
  iconNameFocused: string;
}

const TabIcon: React.FC<TabIconProps> = ({
  focused,
  iconName,
  iconNameFocused,
}) => (
  <View style={styles.tabItem}>
    <Ionicons
      name={focused ? iconNameFocused : iconName}
      size={26}
      color={focused ? COLORS.primary : COLORS.textMuted}
    />
  </View>
);

export const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon
              focused={focused}
              iconName="home-outline"
              iconNameFocused="home"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Prizes"
        component={PrizesScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon
              focused={focused}
              iconName="gift-outline"
              iconNameFocused="gift"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Tickets"
        component={TicketsScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon
              focused={focused}
              iconName="ticket-outline"
              iconNameFocused="ticket"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon
              focused={focused}
              iconName="person-outline"
              iconNameFocused="person"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 0,
    height: 70,
    paddingTop: 10,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
