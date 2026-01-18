import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View, StyleSheet, Text, TouchableOpacity} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {HomeScreen} from '../screens/home';
import {TicketsScreen} from '../screens/tickets';
import {PrizesScreen} from '../screens/prizes';
import {ProfileScreen} from '../screens/profile';
import {COLORS, FONT_FAMILY, FONT_SIZE, FONT_WEIGHT} from '../utils/constants';
import {useThemeColors} from '../hooks/useThemeColors';

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

// Mock Ad Banner Component
const AdBanner: React.FC = () => {
  const {colors, isDark} = useThemeColors();

  return (
    <View style={styles.adBannerContainer}>
      <LinearGradient
        colors={isDark ? ['#2A2520', '#252015'] : ['#FFF5E6', '#FFECD2']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={styles.adBannerGradient}>
        <View style={styles.adBannerContent}>
          <View style={styles.adBannerLeft}>
            <Text style={styles.adBannerLabel}>AD</Text>
          </View>
          <View style={styles.adBannerTextContainer}>
            <Text style={[styles.adBannerTitle, {color: colors.text}]}>Spazio Pubblicitario</Text>
            <Text style={[styles.adBannerSubtitle, {color: colors.textMuted}]}>Il tuo banner qui</Text>
          </View>
          <TouchableOpacity style={styles.adBannerButton}>
            <Text style={styles.adBannerButtonText}>Scopri</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

// Custom Tab Bar with Ad Banner
const CustomTabBar: React.FC<BottomTabBarProps> = ({state, descriptors, navigation}) => {
  const {colors, isDark} = useThemeColors();

  const iconMap: Record<string, {outline: string; filled: string}> = {
    Home: {outline: 'home-outline', filled: 'home'},
    Prizes: {outline: 'gift-outline', filled: 'gift'},
    Tickets: {outline: 'ticket-outline', filled: 'ticket'},
    Profile: {outline: 'person-outline', filled: 'person'},
  };

  // Only show banner on Home tab
  const currentRouteName = state.routes[state.index].name;
  const showBanner = currentRouteName === 'Home';

  return (
    <View style={styles.customTabBarWrapper}>
      {showBanner && <AdBanner />}
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
  adBannerContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#FF6B00',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  adBannerGradient: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  adBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adBannerLeft: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 10,
  },
  adBannerLabel: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  adBannerTextContainer: {
    flex: 1,
  },
  adBannerTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  adBannerSubtitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
  },
  adBannerButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  adBannerButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  tabBarContainer: {
    height: 70,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 107, 0, 0.35)',
  },
  tabBarGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBarContent: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 20,
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
    right: -35,
    height: 20,
    width: 1,
    backgroundColor: 'rgba(255, 107, 0, 0.25)',
  },
});
