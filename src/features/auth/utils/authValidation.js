import { AUTH_LOGIN_MODES } from '../../../services/auth/auth.constants';
import { digitsOnly } from './phone';

export const AUTH_PASSWORD_MIN_LENGTH = 8;
export const AUTH_OTP_LENGTH = 6;

export const trimText = (value) => String(value || '').trim();
export const normalizeOtpValue = (value) => digitsOnly(value).slice(0, AUTH_OTP_LENGTH);

export const hasValidationErrors = (errors) => Object.keys(errors || {}).length > 0;

const isPhonePayloadValid = (phonePayload) => {
  if (!phonePayload || typeof phonePayload !== 'object') return false;
  return Boolean(phonePayload.nationalNumber) && Boolean(phonePayload.e164) && Boolean(phonePayload.isValid);
};

export function validatePublicLogin({ phonePayload, password, t }) {
  const errors = {};
  if (!phonePayload?.nationalNumber) {
    errors.phone = t('auth.errors.phoneRequired');
  } else if (!isPhonePayloadValid(phonePayload)) {
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
  if (!trimText(firstName)) errors.firstName = t('auth.errors.firstNameRequired');
  if (!trimText(lastName)) errors.lastName = t('auth.errors.lastNameRequired');

  if (!phonePayload?.nationalNumber) {
    errors.phone = t('auth.errors.phoneRequired');
  } else if (!isPhonePayloadValid(phonePayload)) {
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
  }

  if (!phonePayload?.nationalNumber) {
    errors.phone = t('auth.errors.phoneRequired');
  } else if (!isPhonePayloadValid(phonePayload)) {
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
