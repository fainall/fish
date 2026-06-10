import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Linking, Alert } from 'react-native';
import * as Updates from 'expo-updates';
import { initSentry } from './src/services/sentry';
import { logScreenView } from './src/services/analytics';
import { supabase } from './src/services/supabase';
import { registerRecoveryListener } from './src/services/recoveryBus';
import ErrorBoundary from './src/components/ErrorBoundary';
import ResetPasswordScreen from './src/screens/auth/ResetPasswordScreen';

// Initialize Sentry before anything else renders
initSentry();
import SplashScreen from './src/screens/SplashScreen';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
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

/** Extrae los tokens de recuperación del deep link (vienen tras # o ?). */
function parseRecoveryTokens(url: string) {
  const frag = (url.split('#')[1] ?? url.split('?')[1] ?? '');
  const params: Record<string, string> = {};
  frag.split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    if (k) params[k] = decodeURIComponent(v ?? '');
  });
  return {
    access_token:  params.access_token,
    refresh_token: params.refresh_token,
    type:          params.type,
    code:          params.code,        // flujo PKCE
    error_code:    params.error_code,  // enlace expirado / ya usado
  };
}

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

  // Rastreo de uso (zona caliente): registra la pantalla activa en cada cambio
  const navRef = useNavigationContainerRef();
  const routeNameRef = useRef<string | undefined>(undefined);

  // ── Recuperación de contraseña por deep link (aquaria://reset-password) ──────
  const [recoveryMode, setRecoveryMode] = useState(false);

  // Bus: permite a ForgotPasswordScreen activar el modo recuperación tras
  // verificar el código OTP del correo (flujo sin deep link).
  useEffect(() => {
    registerRecoveryListener(setRecoveryMode);
    return () => registerRecoveryListener(null);
  }, []);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url || !url.includes('reset-password')) return;
      const { access_token, refresh_token, type, code, error_code } = parseRecoveryTokens(url);

      // Enlace expirado o ya consumido (p. ej. el escáner del correo lo "abrió"
      // antes; son de un solo uso) → avisar en vez de fallar en silencio.
      if (error_code || (!access_token && !code)) {
        console.warn('[Recovery] enlace sin tokens:', url.slice(0, 120), error_code);
        Alert.alert(
          'Enlace no válido o expirado',
          'Este enlace de recuperación ya fue usado o expiró. Vuelve a "¿Olvidaste tu contraseña?" y solicita uno nuevo.',
        );
        return;
      }

      try {
        if (code) {
          // Flujo PKCE: intercambiar el código por sesión
          await supabase.auth.exchangeCodeForSession(code);
        } else if (type === 'recovery' && access_token) {
          await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token ?? '',
          });
        }
      } catch (e) { console.warn('[Recovery] establecer sesión falló:', e); }
      setRecoveryMode(true);
    };
    // Arranque en frío (la app se abrió desde el enlace)
    Linking.getInitialURL().then(handleUrl).catch(() => {});
    // App ya abierta
    const sub = Linking.addEventListener('url', (e) => handleUrl(e.url));
    return () => sub.remove();
  }, []);

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
            {/* Texto oscuro del status bar: la app es de tema claro (crítico en iOS,
                donde style="light" haría invisible la hora sobre el fondo claro) */}
            <StatusBar style="dark" />
            {recoveryMode ? (
              <ResetPasswordScreen onDone={() => setRecoveryMode(false)} />
            ) : (
              <NavigationContainer
                ref={navRef}
                onReady={() => { routeNameRef.current = navRef.getCurrentRoute()?.name; }}
                onStateChange={() => {
                  const prev = routeNameRef.current;
                  const curr = navRef.getCurrentRoute()?.name;
                  if (curr && curr !== prev) logScreenView(curr);
                  routeNameRef.current = curr;
                }}
              >
                <AppNavigator />
              </NavigationContainer>
            )}
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
