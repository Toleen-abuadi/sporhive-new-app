export {
  AUTH_OTP_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  hasValidationErrors,
  normalizeAlphabeticInput,
  normalizeUsernameInput,
  normalizeOtpValue,
  trimText,
  validateOtp,
  validatePlayerLogin,
  validatePublicLogin,
  validatePublicResetPassword,
  validatePublicSignup,
  validateResetRequest,
} from './authValidation';
export { resolveAuthErrorMessage } from './authErrorMessage';
export { sanitizeRedirectTo } from './redirect';
export { formatPhoneForInlineText } from './phone';
