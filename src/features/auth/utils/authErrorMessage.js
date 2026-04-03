import { normalizeAuthError } from '../../../services/auth';

const hasText = (value) => String(value || '').trim().toLowerCase();

export function resolveAuthErrorMessage(error, t, fallbackKey = 'auth.errors.generic') {
  const normalized = normalizeAuthError(error);
  const status = Number(normalized?.status) || 0;
  const code = hasText(normalized?.code);
  const message = hasText(normalized?.message);

  if (code === 'network_error' || code === 'timeout_error' || status === 0) {
    return t('auth.errors.network');
  }

  if (status === 401 || message.includes('invalid credentials') || message.includes('invalid phone or password')) {
    return t('auth.errors.invalidCredentials');
  }

  if (status === 502 || message.includes('academy service unavailable')) {
    return t('auth.errors.academyUnavailable');
  }

  if (message.includes('academy integration not configured')) {
    return t('auth.errors.academyNotConfigured');
  }

  if (message.includes('phone already') || message.includes('already registered') || message.includes('unique')) {
    return t('auth.errors.phoneAlreadyRegistered');
  }

  if (message.includes('invalid or expired code') || message.includes('invalid or expired otp') || message.includes('expired otp')) {
    return t('auth.errors.invalidOtp');
  }

  if (status >= 500) {
    return t('auth.errors.server');
  }

  return t(fallbackKey);
}
