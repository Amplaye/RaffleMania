import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View, StyleSheet, Text, TouchableOpacity} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {HomeScreen} from '../screens/home';
import {PrizesScreen} from '../screens/prizes';
import {TicketsScreen} from '../screens/tickets';
import {ShopScreen} from '../screens/shop';
import {ProfileScreen} from '../screens/profile';
import {COLORS, FONT_FAMILY, FONT_WEIGHT} from '../utils/constants';
import {useThemeColors} from '../hooks/useThemeColors';

export type TabParamList = {
  Home: undefined;
  Prizes: undefined;
  Tickets: undefined;
  Shop: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

interface TabIconProps {
  focused: boolean;
  iconName: string;
  iconNameFocused: string;
  isLast?: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({
  focused,
  iconName,
  iconNameFocused,
  isLast = false,
}) => (
  <View style={styles.tabItem}>
    <Ionicons
      name={focused ? iconNameFocused : iconName}
      size={26}
      color={focused ? COLORS.primary : COLORS.textMuted}
    />
    {!isLast && <View style={styles.tabSeparator} />}
  </View>
);

// Custom Tab Bar
const CustomTabBar: React.FC<BottomTabBarProps> = ({state, descriptors, navigation}) => {
  const {colors, isDark} = useThemeColors();

  const iconMap: Record<string, {outline: string; filled: string}> = {
    Home: {outline: 'home-outline', filled: 'home'},
    Prizes: {outline: 'gift-outline', filled: 'gift'},
    Tickets: {outline: 'ticket-outline', filled: 'ticket'},
    Shop: {outline: 'cart-outline', filled: 'cart'},
    Profile: {outline: 'person-outline', filled: 'person'},
  };

  return (
    <View style={styles.customTabBarWrapper}>
      <View style={styles.tabBarContainer}>
        <LinearGradient
          colors={isDark ? ['#2A2520', '#252015'] : ['#FFE0BD', '#FFDAB3']}
          start={{x: 0.5, y: 0}}
          end={{x: 0.5, y: 1}}
          style={styles.tabBarGradient}
        />
        <View style={styles.tabBarContent}>
          {state.routes.map((route, index) => {
            const {options} = descriptors[route.key];
            const isFocused = state.index === index;
            const isLast = index === state.routes.length - 1;
            const icons = iconMap[route.name] || {outline: 'help-outline', filled: 'help'};

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? {selected: true} : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                style={styles.tabButton}>
                <View style={styles.tabItem}>
                  <Ionicons
                    name={isFocused ? icons.filled : icons.outline}
                    size={26}
                    color={isFocused ? colors.primary : colors.text}
                  />
                  {!isLast && <View style={styles.tabSeparator} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

export const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
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
        name="Shop"
        component={ShopScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon
              focused={focused}
              iconName="cart-outline"
              iconNameFocused="cart"
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
              isLast
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  customTabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBarContainer: {
    height: 65,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 107, 0, 0.35)',
  },
  tabBarGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBarContent: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    position: 'relative',
  },
  tabSeparator: {
    position: 'absolute',
    right: -32,
    height: 20,
    width: 1,
    backgroundColor: 'rgba(255, 107, 0, 0.25)',
  },
});
