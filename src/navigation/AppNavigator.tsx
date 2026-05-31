import React, { useRef, useEffect, useState } from 'react';
import { View, ActivityIndicator, TouchableOpacity, Animated, useWindowDimensions } from 'react-native';
import SplashScreen from '../screens/SplashScreen';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPRING } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAchievements } from '../hooks/useAchievements';
import AchievementToast from '../components/AchievementToast';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Onboarding
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';

// User screens
import HomeScreen from '../screens/user/HomeScreen';
import AquariumScreen from '../screens/user/AquariumScreen';
import ExploreScreen from '../screens/user/ExploreScreen';
import ProfileScreen from '../screens/user/ProfileScreen';

// Stack sub-screens (accessed from tabs)
import ParametersScreen from '../screens/user/ParametersScreen';
import HealthScreen from '../screens/user/HealthScreen';
import CalculatorScreen from '../screens/user/CalculatorScreen';
import BreedingScreen from '../screens/user/BreedingScreen';
import TasksScreen from '../screens/user/TasksScreen';
import WishlistScreen from '../screens/user/WishlistScreen';
import GalleryScreen from '../screens/user/GalleryScreen';
import CommunityScreen from '../screens/user/CommunityScreen';
import ChatScreen from '../screens/user/ChatScreen';
import LegalScreen from '../screens/user/LegalScreen';
import SupportScreen from '../screens/user/SupportScreen';

// Admin screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Stack navigators for each main tab
const HomeStack = createStackNavigator();
const AquariumStack = createStackNavigator();
const ExploreStack = createStackNavigator();
const ProfileStack = createStackNavigator();

// Shared transition config for all stack navigators
const stackScreenOptions = {
  headerShown: false,
  cardStyleInterpolator: ({ current, layouts }: any) => ({
    cardStyle: {
      opacity: current.progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
      transform: [{
        translateX: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [layouts.screen.width * 0.25, 0],
        }),
      }],
    },
  }),
  transitionSpec: {
    open:  { animation: 'timing' as const, config: { duration: 280 } },
    close: { animation: 'timing' as const, config: { duration: 220 } },
  },
};

// ── Animated icon — spring scale on focus ────────────────────────────────────
function AnimatedTabIcon({
  iconName, color, focused, iconSize = 24,
}: { iconName: string; color: string; focused: boolean; iconSize?: number }) {
  const scale = useRef(new Animated.Value(focused ? 1.12 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.15 : 1,
      tension: SPRING.snap.tension,
      friction: SPRING.snap.friction,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name={iconName as any} size={iconSize} color={color} />
    </Animated.View>
  );
}

// ── Animated tab button — top cyan indicator ──────────────────────────────────
function TabButton(props: any) {
  const { style, children, onPress, onLongPress, accessibilityState, ...rest } = props;
  const focused = accessibilityState?.selected ?? false;
  const indicatorScale = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(indicatorScale, {
      toValue: focused ? 1 : 0,
      tension: SPRING.snap.tension,
      friction: SPRING.snap.friction,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityState={accessibilityState}
      activeOpacity={0.75}
      style={[style, { alignItems: 'center', justifyContent: 'center' }]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          width: 28,
          height: 2,
          borderRadius: 1,
          backgroundColor: COLORS.primary,
          transform: [{ scaleX: indicatorScale }],
        }}
      />
      {children}
    </TouchableOpacity>
  );
}

// ── Stack navigators for each tab ────────────────────────────────────────────

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackScreenOptions}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="Tasks" component={TasksScreen} />
    </HomeStack.Navigator>
  );
}

function AquariumStackNavigator() {
  return (
    <AquariumStack.Navigator screenOptions={stackScreenOptions}>
      <AquariumStack.Screen name="AquariumMain" component={AquariumScreen} />
      <AquariumStack.Screen name="Parameters" component={ParametersScreen} />
      <AquariumStack.Screen name="Health" component={HealthScreen} />
      <AquariumStack.Screen name="Calculator" component={CalculatorScreen} />
      <AquariumStack.Screen name="Breeding" component={BreedingScreen} />
    </AquariumStack.Navigator>
  );
}

function ExploreStackNavigator() {
  return (
    <ExploreStack.Navigator screenOptions={stackScreenOptions}>
      <ExploreStack.Screen name="ExploreMain" component={ExploreScreen} />
      <ExploreStack.Screen name="Wishlist" component={WishlistScreen} />
    </ExploreStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={stackScreenOptions}>
      <ProfileStack.Screen name="ProfileMain">
        {(props) => <ProfileScreen {...props} onClose={() => props.navigation.goBack()} />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Gallery" component={GalleryScreen} />
      <ProfileStack.Screen name="Community" component={CommunityScreen} />
      <ProfileStack.Screen name="Chat" component={ChatScreen} />
      <ProfileStack.Screen name="Legal" component={LegalScreen} />
      <ProfileStack.Screen name="Support" component={SupportScreen} />
    </ProfileStack.Navigator>
  );
}

function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

const TAB_ICONS: Record<string, [string, string]> = {
  Home:    ['home',    'home-outline'   ],
  Aquarium:['cube',    'cube-outline'   ],
  Explore: ['compass', 'compass-outline'],
  Profile: ['person',  'person-outline' ],
};

function UserTabNavigator() {
  const { width } = useWindowDimensions();
  const factor = Math.min(1.25, Math.max(0.9, width / 375));
  const tabH = Math.round(56 * factor);
  const iconSize = Math.round(24 * factor);
  const labelSize = Math.round(11 * factor * 10) / 10;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const [active, inactive] = TAB_ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
        return {
          headerShown: false,
          lazy: true,
          animation: 'shift',
          tabBarStyle: {
            backgroundColor: COLORS.backgroundCard,
            borderTopColor: COLORS.border,
            borderTopWidth: 1,
            paddingBottom: 4,
            paddingTop: 4,
            height: tabH,
          },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarLabelStyle: {
            fontSize: labelSize,
            fontFamily: FONTS.sansMd,
            marginTop: 1,
          },
          tabBarButton: (props) => <TabButton {...props} />,
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon iconName={focused ? active : inactive} color={color} focused={focused} iconSize={iconSize} />
          ),
        };
      }}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} options={{ title: 'Inicio' }} />
      <Tab.Screen name="Aquarium" component={AquariumStackNavigator} options={{ title: 'Acuario' }} />
      <Tab.Screen name="Explore" component={ExploreStackNavigator} options={{ title: 'Explorar' }} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

// Minimum time the splash is shown regardless of how fast auth loads (ms)
const SPLASH_MIN_MS = 2500;

export default function AppNavigator() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();

  const [minDone, setMinDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), SPLASH_MIN_MS);
    return () => clearTimeout(t);
  }, []);

  if (authLoading || profileLoading || !minDone) {
    return <SplashScreen />;
  }

  if (!user) return <AuthNavigator />;

  if (user.role === 'admin') {
    return (
      <Stack.Navigator screenOptions={stackScreenOptions}>
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      </Stack.Navigator>
    );
  }

  if (!profile.onboarding_completed) {
    return (
      <Stack.Navigator screenOptions={stackScreenOptions}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      </Stack.Navigator>
    );
  }

  return <UserAppWithToast />;
}

function UserAppWithToast() {
  const { newBadge, dismissBadge } = useAchievements();
  return (
    <View style={{ flex: 1 }}>
      <UserTabNavigator />
      {newBadge && (
        <AchievementToast achievement={newBadge} onDismiss={dismissBadge} />
      )}
    </View>
  );
}
