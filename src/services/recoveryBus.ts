/**
 * recoveryBus — puente mínimo para activar el "modo recuperación" global.
 *
 * App.tsx registra el listener (setRecoveryMode). Pantallas como
 * ForgotPasswordScreen lo disparan tras verificar el código OTP, para que
 * la app muestre ResetPasswordScreen por encima de la navegación normal.
 */
type Cb = (on: boolean) => void;

let listener: Cb | null = null;

export function registerRecoveryListener(fn: Cb | null) {
  listener = fn;
}

export function triggerRecoveryMode() {
  listener?.(true);
}
