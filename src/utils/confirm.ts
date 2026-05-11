/**
 * confirm.ts
 * Cross-platform confirmation dialog helper.
 *
 * On web, Alert.alert() with button callbacks is broken (callbacks never fire).
 * Use this helper instead of Alert.alert() for any destructive/confirm action.
 */
import { Alert, Platform } from 'react-native';

/**
 * Shows a confirmation dialog and calls `onConfirm` if the user accepts.
 *
 * @param title       Dialog title
 * @param message     Dialog message
 * @param onConfirm   Called when user confirms
 * @param confirmText Label for the confirm button (default "Eliminar")
 * @param destructive Whether to style the confirm button as destructive (default true)
 */
export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = 'Eliminar',
  destructive = true,
) {
  if (Platform.OS === 'web') {
    if ((window as any).confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
