import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';

export default function RegisterScreen({ navigation }: any) {
  const { signUp } = useAuth();
  const { signIn: googleSignIn, loading: googleLoading, ready: googleReady } = useGoogleAuth();
  const [fullName, setFullName]               = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]                 = useState(false);

  // ── Email registration ────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Completa todos los campos.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const { error, needsConfirmation } = await signUp(email.trim(), password, fullName.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    if (needsConfirmation) {
      Alert.alert(
        '📧 Revisa tu correo',
        `Te enviamos un email a ${email.trim()} para confirmar tu cuenta. Haz clic en el enlace y luego inicia sesión.`,
        [{ text: 'Entendido', onPress: () => navigation.navigate('Login') }],
      );
      return;
    }
    // On success with active session, useAuth sets the user → AppNavigator redirects
  };

  return (
    <LinearGradient colors={['#EDF6FB', '#F4FAFD', '#EDF6FB']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Ionicons name="fish" size={40} color={COLORS.primary} />
            <Text style={styles.title}>Crear Cuenta</Text>
            <Text style={styles.subtitle}>Únete a la comunidad acuarista</Text>
          </View>

          {/* Google button */}
          <TouchableOpacity
            style={[styles.googleBtn, googleLoading && styles.btnDisabled]}
            onPress={googleSignIn}
            disabled={googleLoading || !googleReady}
          >
            {googleLoading ? (
              <ActivityIndicator color="#555" size="small" />
            ) : (
              <>
                <GoogleIcon />
                <Text style={styles.googleBtnText}>Registrarse con Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o con correo</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            {[
              { label: 'Nombre completo',      value: fullName,         setter: setFullName,         icon: 'person-outline',      placeholder: 'Tu nombre',  secure: false, keyboard: 'default' as const },
              { label: 'Correo electrónico',   value: email,            setter: setEmail,            icon: 'mail-outline',        placeholder: 'tu@email.com', secure: false, keyboard: 'email-address' as const },
              { label: 'Contraseña',           value: password,         setter: setPassword,         icon: 'lock-closed-outline', placeholder: '••••••••',   secure: true,  keyboard: 'default' as const },
              { label: 'Confirmar contraseña', value: confirmPassword,  setter: setConfirmPassword,  icon: 'lock-closed-outline', placeholder: '••••••••',   secure: true,  keyboard: 'default' as const },
            ].map(({ label, value, setter, icon, placeholder, secure, keyboard }) => (
              <View key={label}>
                <Text style={styles.label}>{label}</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name={icon as any} size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={setter}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={secure}
                    keyboardType={keyboard}
                    autoCapitalize={keyboard === 'email-address' ? 'none' : 'words'}
                  />
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.button, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.buttonText}>Crear Cuenta</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
              <Text style={styles.loginText}>
                ¿Ya tienes cuenta? <Text style={styles.loginTextBold}>Inicia sesión</Text>
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function GoogleIcon() {
  return (
    <View style={styles.googleIcon}>
      <Text style={styles.googleIconText}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: SPACING.lg },
  backButton: { marginTop: SPACING.lg, marginBottom: SPACING.md },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginTop: SPACING.sm, fontFamily: FONTS.sansEb },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, fontFamily: FONTS.sans },

  // Google
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.md,
    padding: 14, marginBottom: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  googleBtnText: { color: '#3c4043', fontWeight: '600', fontSize: 15, fontFamily: FONTS.sansSb },
  googleIcon: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center',
  },
  googleIconText: { color: '#fff', fontWeight: 'bold', fontSize: 13, fontFamily: FONTS.sansBd },
  btnDisabled: { opacity: 0.6 },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.sans },

  // Form
  form: {},
  label: { color: COLORS.textSecondary, fontSize: 13, marginBottom: SPACING.xs, marginTop: SPACING.md, fontFamily: FONTS.sans },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  inputIcon: { marginRight: SPACING.sm },
  input: { flex: 1, color: COLORS.text, paddingVertical: 14, fontSize: 15, fontFamily: FONTS.sans },
  button: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    padding: 16, alignItems: 'center', marginTop: SPACING.xl,
  },
  buttonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16, fontFamily: FONTS.sansEb },
  loginLink: { alignItems: 'center', marginTop: SPACING.md },
  loginText: { color: COLORS.textSecondary, fontSize: 14, fontFamily: FONTS.sans },
  loginTextBold: { color: COLORS.primary, fontWeight: 'bold', fontFamily: FONTS.sansBd },
});
