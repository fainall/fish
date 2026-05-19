import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';
import ErrorBoundary from './src/components/ErrorBoundary';
import SplashScreen from './src/screens/SplashScreen';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from '@expo-google-fonts/dm-sans';
import {
  DMSerifDisplay_400Regular,
} from '@expo-google-fonts/dm-serif-display';
import { AuthProvider } from './src/hooks/useAuth';
import { UserProfileProvider } from './src/hooks/useUserProfile';
import { FishDatabaseProvider } from './src/hooks/useFishDatabase';
import { FishSuggestionsProvider } from './src/hooks/useFishSuggestions';
import { AquariumsProvider } from './src/hooks/useAquariums';
import { ParameterRecordsProvider } from './src/hooks/useParameterRecords';
import { TasksProvider } from './src/hooks/useTasks';
import { BreedingProvider } from './src/hooks/useBreeding';
import { AchievementsProvider } from './src/hooks/useAchievements';
import { WishlistProvider } from './src/hooks/useWishlist';
import { FishHistoryProvider } from './src/hooks/useFishHistory';
import { AquariumGalleryProvider } from './src/hooks/useAquariumGallery';
import { useFishImagePrefetch } from './src/hooks/useFishImagePrefetch';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    DMSerifDisplay_400Regular,
  });

  // Prefetch all fish images in background → instant load on next screens
  useFishImagePrefetch();

  // Check for OTA updates on every app boot — apply on next launch (no reload loop)
  useEffect(() => {
    if (__DEV__) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable && !cancelled) {
          await Updates.fetchUpdateAsync();
          // Update is staged — it will activate on the NEXT app launch.
          // We intentionally do NOT call reloadAsync() here because it can
          // trigger an infinite reload loop if called unconditionally on boot.
        }
      } catch (e) { console.warn('[Updates] OTA check failed:', e); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!fontsLoaded) {
    return <SplashScreen />;
  }

  return (
    <ErrorBoundary>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <FishDatabaseProvider>
          <FishSuggestionsProvider>
          <AquariumsProvider>
          <ParameterRecordsProvider>
          <TasksProvider>
          <BreedingProvider>
          <WishlistProvider>
          <FishHistoryProvider>
          <AquariumGalleryProvider>
          <AchievementsProvider>
          <UserProfileProvider>
            <NavigationContainer>
              <StatusBar style="light" backgroundColor="#071520" />
              <AppNavigator />
            </NavigationContainer>
          </UserProfileProvider>
          </AchievementsProvider>
          </AquariumGalleryProvider>
          </FishHistoryProvider>
          </WishlistProvider>
          </BreedingProvider>
          </TasksProvider>
          </ParameterRecordsProvider>
          </AquariumsProvider>
          </FishSuggestionsProvider>
          </FishDatabaseProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
