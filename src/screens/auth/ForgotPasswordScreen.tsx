/**
 * ForgotPasswordScreen — Recuperación de contraseña por CÓDIGO (OTP).
 *
 * Flujo: el usuario pide recuperación → el correo trae un código de 6 dígitos
 * → lo escribe AQUÍ → verifyOtp establece la sesión → se abre la pantalla
 * "Nueva contraseña" (modo recuperación global vía recoveryBus).
 *
 * Este flujo NO depende del deep link del correo (los enlaces de un solo uso
 * los consumen los escáneres de Gmail con frecuencia). El enlace del correo
 * se mantiene como atajo secundario, pero el código siempre funciona.
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
import { triggerRecoveryMode } from '../../services/recoveryBus';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [sent, setSent]           = useState(false);
  const [code, setCode]           = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleVerifyCode = async () => {
    const c = code.trim();
    // El largo del OTP es configurable en Supabase (6-10 dígitos) → aceptar rango
    if (c.length < 6) {
      Alert.alert('Código incompleto', 'Escribe el código completo que te llegó por correo.');
      return;
    }
    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: c,
        type: 'recovery',
      });
      if (error) {
        Alert.alert('Código no válido', 'El código es incorrecto o expiró. Toca "Reenviar código" para recibir uno nuevo.');
        return;
      }
      // Sesión de recuperación establecida → abrir pantalla "Nueva contraseña"
      triggerRecoveryMode();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo verificar el código.');
    } finally {
      setVerifying(false);
    }
  };

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
                <Ionicons name="mail-unread-outline" size={40} color={COLORS.primary} />
                <Text style={styles.successTitle}>Revisa tu correo</Text>
                <Text style={styles.successText}>
                  Si <Text style={{ fontFamily: FONTS.sansBd }}>{email.trim().toLowerCase()}</Text> tiene una cuenta,
                  te llegará un <Text style={{ fontFamily: FONTS.sansBd }}>código de verificación</Text>.
                  Escríbelo aquí (revisa también spam).
                </Text>
              </View>

              <Text style={styles.label}>Código del correo</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="keypad-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  value={code}
                  onChangeText={v => setCode(v.replace(/[^0-9]/g, ''))}
                  placeholder="12345678"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  maxLength={10}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.loginButton, (verifying || code.length < 6) && styles.btnDisabled]}
                onPress={handleVerifyCode}
                disabled={verifying || code.length < 6}
              >
                {verifying
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={styles.loginButtonText}>Verificar código</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setSent(false); setCode(''); }} style={styles.registerLink}>
                <Text style={styles.registerText}>Reenviar código / corregir correo</Text>
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
  codeInput: { fontSize: 20, letterSpacing: 4, fontFamily: FONTS.sansBd },
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
