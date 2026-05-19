import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

/**
 * Initialize Sentry crash reporting.
 * Only runs in production builds — silently skips if no DSN is configured.
 */
export function initSentry() {
  if (__DEV__ || !SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // Adjust this value in production to reduce costs.
    tracesSampleRate: 0.2,
    // Capture unhandled promise rejections
    enableAutoPerformanceTracing: true,
    // Add breadcrumbs for debugging
    attachStacktrace: true,
    // Environment tag
    environment: __DEV__ ? 'development' : 'production',
  });
}

/**
 * Capture a non-fatal error with context.
 */
export function captureError(error: Error, context?: Record<string, any>) {
  if (__DEV__) {
    console.warn('[Sentry] Would capture:', error.message, context);
    return;
  }
  if (context) {
    Sentry.withScope(scope => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Identify the current user for crash reports.
 */
export function identifyUser(id: string, email?: string) {
  if (__DEV__) return;
  Sentry.setUser({ id, email });
}

/**
 * Clear user identity on logout.
 */
export function clearUser() {
  if (__DEV__) return;
  Sentry.setUser(null);
}

export { Sentry };
