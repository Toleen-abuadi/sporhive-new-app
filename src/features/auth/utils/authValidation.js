import { AUTH_LOGIN_MODES } from '../../../services/auth/auth.constants';
import { digitsOnly } from './phone';

export const AUTH_PASSWORD_MIN_LENGTH = 8;
export const AUTH_OTP_LENGTH = 6;
export const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export const trimText = (value) => String(value || '').trim();
export const normalizeAlphabeticInput = (value) => {
  return String(value || '')
    // allow letters (arabic + english), spaces, hyphen, apostrophe
    .replace(/[^\p{L}\s'-]/gu, '')
    // remove extra spaces
    .replace(/\s{2,}/g, ' ')
    .trimStart();
};
export const normalizeUsernameInput = (value) =>
  String(value || '')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .trimStart();
export const normalizeOtpValue = (value) => digitsOnly(value).slice(0, AUTH_OTP_LENGTH);

export const hasValidationErrors = (errors) => Object.keys(errors || {}).length > 0;

const E164_PHONE_REGEX = /^\+\d{8,16}$/;

const validatePhonePayload = (phonePayload) => {
  if (!phonePayload || typeof phonePayload !== 'object') return false;

  const national = digitsOnly(phonePayload.nationalNumber || '');
  const e164 = String(phonePayload.e164 || '').trim();
  const minLength = Number(phonePayload.minLength) || 7;
  const maxLength = Number(phonePayload.maxLength) || 15;
  const lengthOk = national.length >= minLength && national.length <= maxLength;

  if (!national || !e164) return false;
  if (!E164_PHONE_REGEX.test(e164)) return false;
  if (!lengthOk) return false;
  if (!phonePayload.isValid) return false;

  return true;
};

export function validatePublicLogin({ phonePayload, password, t }) {
  const errors = {};
  if (!phonePayload?.nationalNumber) {
    errors.phone = t('auth.errors.phoneRequired');
  } else if (!validatePhonePayload(phonePayload)) {
    errors.phone = t('auth.errors.phoneInvalid');
  }

  if (!trimText(password)) {
    errors.password = t('auth.errors.passwordRequired');
  }
  return errors;
}

export function validatePlayerLogin({ academyId, username, password, t }) {
  const errors = {};
  if (!academyId) {
    errors.academy = t('auth.errors.academyRequired');
  }
  if (!trimText(username)) {
    errors.username = t('auth.errors.usernameRequired');
  } else if (!USERNAME_REGEX.test(trimText(username))) {
    errors.username = t('auth.errors.usernameInvalid');
  }
  if (!trimText(password)) {
    errors.password = t('auth.errors.passwordRequired');
  }
  return errors;
}

export function validatePublicSignup({
  firstName,
  lastName,
  phonePayload,
  password,
  confirmPassword,
  t,
}) {
  const errors = {};

  if (!phonePayload?.nationalNumber) {
    errors.phone = t('auth.errors.phoneRequired');
  } else if (!validatePhonePayload(phonePayload)) {
    errors.phone = t('auth.errors.phoneInvalid');
  }

  if (!trimText(password)) {
    errors.password = t('auth.errors.passwordRequired');
  } else if (String(password).length < AUTH_PASSWORD_MIN_LENGTH) {
    errors.password = t('auth.errors.passwordTooShort', { count: AUTH_PASSWORD_MIN_LENGTH });
  }

  if (!trimText(confirmPassword)) {
    errors.confirmPassword = t('auth.errors.confirmPasswordRequired');
  } else if (String(password) !== String(confirmPassword)) {
    errors.confirmPassword = t('auth.errors.passwordMismatch');
  }

  return errors;
}

export function validateResetRequest({ mode, academyId, username, phonePayload, t }) {
  const errors = {};
  const resolvedMode = mode === AUTH_LOGIN_MODES.PLAYER ? AUTH_LOGIN_MODES.PLAYER : AUTH_LOGIN_MODES.PUBLIC;

  if (resolvedMode === AUTH_LOGIN_MODES.PLAYER && !academyId) {
    errors.academy = t('auth.errors.academyRequired');
  }

  if (resolvedMode === AUTH_LOGIN_MODES.PLAYER && !trimText(username)) {
    errors.username = t('auth.errors.usernameRequired');
  } else if (resolvedMode === AUTH_LOGIN_MODES.PLAYER && !USERNAME_REGEX.test(trimText(username))) {
    errors.username = t('auth.errors.usernameInvalid');
  }

  if (!phonePayload?.nationalNumber) {
    errors.phone = t('auth.errors.phoneRequired');
  } else if (!validatePhonePayload(phonePayload)) {
    errors.phone = t('auth.errors.phoneInvalid');
  }

  return errors;
}

export function validateOtp({ otp, t }) {
  const errors = {};
  const clean = normalizeOtpValue(otp);
  if (!clean) {
    errors.otp = t('auth.errors.otpRequired');
  } else if (clean.length !== AUTH_OTP_LENGTH) {
    errors.otp = t('auth.errors.otpLength', { count: AUTH_OTP_LENGTH });
  }
  return errors;
}

export function validatePublicResetPassword({ password, confirmPassword, t }) {
  const errors = {};

  if (!trimText(password)) {
    errors.password = t('auth.errors.passwordRequired');
  } else if (String(password).length < AUTH_PASSWORD_MIN_LENGTH) {
    errors.password = t('auth.errors.passwordTooShort', { count: AUTH_PASSWORD_MIN_LENGTH });
  }

  if (!trimText(confirmPassword)) {
    errors.confirmPassword = t('auth.errors.confirmPasswordRequired');
  } else if (String(password) !== String(confirmPassword)) {
    errors.confirmPassword = t('auth.errors.passwordMismatch');
  }

  return errors;
}
