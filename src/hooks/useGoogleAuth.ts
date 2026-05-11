/**
 * useGoogleAuth
 * Centralises Google OAuth logic used by both LoginScreen and RegisterScreen.
 *
 * Fixes applied vs the original inline implementation:
 *  - useProxy removed (deprecated Expo SDK 50+)
 *  - openid scope added so Google returns an id_token
 *  - id_token passed through to useAuth.signInWithGoogle
 *  - response.authentication null-checked before destructuring
 */

import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { useAuth } from './useAuth';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

const isPlaceholder = (v?: string) => !v || v === 'YOUR_GOOGLE_WEB_CLIENT_ID' ||
  v === 'YOUR_GOOGLE_ANDROID_CLIENT_ID' || v === 'YOUR_GOOGLE_IOS_CLIENT_ID';

// Platform-aware: Google requires the matching Client ID for the running OS.
// If missing, the hook would crash on mount (invariantClientId).
export const googleConfigured = (() => {
  if (isPlaceholder(GOOGLE_WEB_CLIENT_ID)) return false;
  if (Platform.OS === 'android') return !isPlaceholder(GOOGLE_ANDROID_CLIENT_ID);
  if (Platform.OS === 'ios')     return !isPlaceholder(GOOGLE_IOS_CLIENT_ID);
  return true; // web only needs webClientId
})();

// Dummy ID that satisfies expo-auth-session's invariant when Google isn't
// actually configured for this platform. signIn() will refuse below with a
// friendly message instead of crashing on app boot.
const DUMMY_ID = '000000000000-dummy.apps.googleusercontent.com';

export function useGoogleAuth() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  // makeRedirectUri without useProxy (deprecated). For Expo Go this produces
  // exp://... automatically; for standalone builds set scheme in app.json.
  // On web this produces http://localhost:<port> — that URI must be added to
  // Google Cloud Console → OAuth client → Authorized redirect URIs.
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'aquaria' });


  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId:     isPlaceholder(GOOGLE_WEB_CLIENT_ID)     ? DUMMY_ID : GOOGLE_WEB_CLIENT_ID,
    iosClientId:     isPlaceholder(GOOGLE_IOS_CLIENT_ID)     ? DUMMY_ID : GOOGLE_IOS_CLIENT_ID,
    androidClientId: isPlaceholder(GOOGLE_ANDROID_CLIENT_ID) ? DUMMY_ID : GOOGLE_ANDROID_CLIENT_ID,
    redirectUri,
    // openid scope is required to receive an id_token from Google.
    // id_token is what Supabase signInWithIdToken expects.
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const auth = response.authentication;
      if (!auth) {
        setLoading(false);
        Alert.alert('Error', 'No se recibió autenticación de Google.');
        return;
      }
      handleAuthentication(auth.accessToken, auth.idToken ?? undefined);
    } else if (response.type === 'error') {
      setLoading(false);
      Alert.alert('Error', 'No se pudo conectar con Google. Inténtalo de nuevo.');
    } else if (response.type === 'dismiss' || response.type === 'cancel') {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  async function handleAuthentication(accessToken: string, idToken?: string) {
    try {
      // Fetch Google user profile (needed for demo/local mode)
      const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('No se pudo obtener el perfil de Google.');
      const googleUser = await res.json();

      const { error } = await signInWithGoogle({
        id:          googleUser.id,
        email:       googleUser.email,
        name:        googleUser.name,
        picture:     googleUser.picture,
        given_name:  googleUser.given_name,
        family_name: googleUser.family_name,
        idToken,     // passed to Supabase signInWithIdToken in real mode
      });

      if (error) Alert.alert('Error', error);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Error al iniciar sesión con Google.');
    } finally {
      setLoading(false);
    }
  }

  const signIn = async () => {
    if (!googleConfigured) {
      Alert.alert(
        'Google no configurado',
        'Para activar el login con Google agrega tus Client IDs en .env:\n\n' +
        'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID\nEXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID\nEXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID\n\n' +
        'Créalos en console.cloud.google.com → Credenciales → OAuth 2.0.',
        [{ text: 'Entendido' }]
      );
      return;
    }
    setLoading(true);
    await promptAsync();
  };

  return { signIn, loading, ready: !!request };
}
