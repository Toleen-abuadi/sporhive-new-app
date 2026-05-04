import { normalizeAuthError } from '../../../services/auth';

const hasText = (value) => String(value || '').trim().toLowerCase();

export function resolveAuthErrorMessage(error, t, fallbackKey = 'auth.errors.generic') {
  const normalized = normalizeAuthError(error);
  const status = Number(normalized?.status) || 0;
  const code = hasText(normalized?.code);
  const message = hasText(normalized?.message);
  const hasCredentialSubject = message.includes('username') || message.includes('phone');
  const hasCredentialFailure =
    message.includes('invalid') ||
    message.includes('wrong') ||
    message.includes('not found') ||
    message.includes('does not exist');
  const explicitCredentialError =
    message.includes('invalid credentials') ||
    message.includes('invalid phone or password') ||
    message.includes('invalid username') ||
    message.includes('invalid phone') ||
    message.includes('invalid user') ||
    message.includes('username not found') ||
    message.includes('phone not found') ||
    message.includes('user not found');
  const otpFailure =
    message.includes('invalid or expired code') ||
    message.includes('invalid or expired otp') ||
    message.includes('expired otp') ||
    message.includes('wrong otp') ||
    message.includes('invalid otp');

  if (code === 'network_error' || code === 'timeout_error' || status === 0) {
    return t('auth.errors.network');
  }

  if (status === 401 || explicitCredentialError || (hasCredentialSubject && hasCredentialFailure)) {
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

  if (otpFailure) {
    return t('auth.errors.invalidOtp');
  }

  if (status >= 500) {
    return t('auth.errors.server');
  }

  return t(fallbackKey);
}
