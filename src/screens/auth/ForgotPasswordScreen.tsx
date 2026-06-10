/**
 * ForgotPasswordScreen — Recuperación de contraseña.
 * Envía un correo de recuperación vía Supabase (resetPasswordForEmail).
 * El usuario sigue el enlace del email para fijar una nueva contraseña.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { supabase, IS_DEMO_MODE } from '../../services/supabase';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleReset = async () => {
    const e = email.trim().toLowerCase();
    if (!e || !e.includes('@')) {
      Alert.alert('Correo inválido', 'Escribe un correo electrónico válido.');
      return;
    }
    if (IS_DEMO_MODE) {
      Alert.alert('Modo demo', 'La recuperación de contraseña requiere conexión real.');
      return;
    }
    setLoading(true);
    try {
      // El enlace del correo abre la app en la pantalla "nueva contraseña" (deep link).
      const { error } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo: 'aquaria://reset-password',
      });
      // No revelamos si el correo existe o no (buena práctica de seguridad):
      // mostramos éxito igual. Solo registramos errores reales en consola.
      if (error) console.warn('[ForgotPassword] resetPasswordForEmail:', error.message);
      setSent(true);
    } catch (err) {
      console.warn('[ForgotPassword] failed:', err);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#EDF6FB', '#F4FAFD', '#EDF6FB']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-open-outline" size={34} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Recuperar contraseña</Text>
            <Text style={styles.subtitle}>
              Te enviaremos un enlace a tu correo para crear una nueva contraseña.
            </Text>
          </View>

          {sent ? (
            <View style={styles.form}>
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={40} color={COLORS.success} />
                <Text style={styles.successTitle}>Revisa tu correo</Text>
                <Text style={styles.successText}>
                  Si <Text style={{ fontFamily: FONTS.sansBd }}>{email.trim().toLowerCase()}</Text> tiene una cuenta,
                  recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.
                </Text>
              </View>
              <TouchableOpacity style={styles.loginButton} onPress={() => navigation.goBack()}>
                <Text style={styles.loginButtonText}>Volver a iniciar sesión</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Correo electrónico</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tu@email.com"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.btnDisabled]}
                onPress={handleReset}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={styles.loginButtonText}>Enviar enlace</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.registerLink}>
                <Text style={styles.registerText}>Volver a iniciar sesión</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: SPACING.lg, justifyContent: 'center' },

  backBtn: {
    position: 'absolute', top: SPACING.xl, left: SPACING.lg,
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.backgroundCard,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  iconCircle: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: COLORS.primary + '18',
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.xs, fontFamily: FONTS.sansEb, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, fontFamily: FONTS.sans, textAlign: 'center', lineHeight: 20, paddingHorizontal: SPACING.md },

  btnDisabled: { opacity: 0.6 },
  form: { marginBottom: SPACING.lg },
  label: { color: COLORS.textSecondary, fontSize: 13, marginBottom: SPACING.xs, marginTop: SPACING.md, fontFamily: FONTS.sans },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  inputIcon: { marginRight: SPACING.sm },
  input: { flex: 1, color: COLORS.text, paddingVertical: 14, fontSize: 15, fontFamily: FONTS.sans },
  loginButton: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    padding: 16, alignItems: 'center', marginTop: SPACING.lg,
  },
  loginButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16, fontFamily: FONTS.sansEb },
  registerLink: { alignItems: 'center', marginTop: SPACING.md },
  registerText: { color: COLORS.primary, fontSize: 14, fontFamily: FONTS.sansSb },

  successBox: {
    alignItems: 'center', gap: SPACING.sm, padding: SPACING.lg,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  successTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansEb },
  successText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19, fontFamily: FONTS.sans },
});
