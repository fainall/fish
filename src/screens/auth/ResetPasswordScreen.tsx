/**
 * ResetPasswordScreen — Fijar nueva contraseña.
 * Se muestra cuando el usuario abre el enlace de recuperación del correo
 * (deep link aquaria://reset-password). La sesión de recuperación ya fue
 * establecida por el handler de App.tsx; aquí solo se fija la nueva clave.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { supabase } from '../../services/supabase';

interface Props {
  onDone: () => void;
}

export default function ResetPasswordScreen({ onDone }: Props) {
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [show, setShow]           = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleUpdate = async () => {
    if (password.length < 6) {
      Alert.alert('Contraseña corta', 'Debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('No coinciden', 'Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      // Red de seguridad: si updateUser no resuelve en 15s (p. ej. un lock de
      // auth atascado), no dejamos el spinner infinito.
      const TIMEOUT = Symbol('timeout');
      const result = await Promise.race([
        supabase.auth.updateUser({ password }),
        new Promise(resolve => setTimeout(() => resolve(TIMEOUT), 15000)),
      ]);

      if (result === TIMEOUT) {
        Alert.alert(
          'Tardó demasiado',
          'La operación no respondió a tiempo. Es posible que tu contraseña ya se haya cambiado: intenta iniciar sesión con la nueva. Si no, solicita un código nuevo.',
          [{ text: 'Entendido', onPress: onDone }],
        );
        setLoading(false);
        return;
      }

      const { error } = result as { error: any };
      if (error) {
        Alert.alert('Error', error.message || 'No se pudo actualizar la contraseña. El código pudo expirar; solicita uno nuevo.');
        setLoading(false);
        return;
      }
      Alert.alert('✅ Contraseña actualizada', 'Tu contraseña fue cambiada con éxito.', [
        { text: 'Continuar', onPress: onDone },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#EDF6FB', '#F4FAFD', '#EDF6FB']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="key-outline" size={34} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Nueva contraseña</Text>
            <Text style={styles.subtitle}>Crea una contraseña nueva para tu cuenta.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Nueva contraseña</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!show}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShow(!show)}>
                <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirmar contraseña</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!show}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.btnDisabled]}
              onPress={handleUpdate}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.buttonText}>Guardar contraseña</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={onDone} style={styles.cancelLink}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: SPACING.lg, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  iconCircle: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: COLORS.primary + '18',
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.xs, fontFamily: FONTS.sansEb, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, fontFamily: FONTS.sans, textAlign: 'center', lineHeight: 20 },
  btnDisabled: { opacity: 0.6 },
  form: { marginBottom: SPACING.lg },
  label: { color: COLORS.textSecondary, fontSize: 13, marginBottom: SPACING.xs, marginTop: SPACING.md, fontFamily: FONTS.sans },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  inputIcon: { marginRight: SPACING.sm },
  input: { flex: 1, color: COLORS.text, paddingVertical: 14, fontSize: 15, fontFamily: FONTS.sans },
  button: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    padding: 16, alignItems: 'center', marginTop: SPACING.lg,
  },
  buttonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16, fontFamily: FONTS.sansEb },
  cancelLink: { alignItems: 'center', marginTop: SPACING.md },
  cancelText: { color: COLORS.textMuted, fontSize: 14, fontFamily: FONTS.sans },
});
