const ARABIC_INDIC_DIGITS = '\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669';
const EASTERN_ARABIC_DIGITS = '\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9';

export const toEnglishDigits = (value) =>
  String(value ?? '')
    .replace(/[\u0660-\u0669]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)))
    .replace(/[\u06F0-\u06F9]/g, (digit) => String(EASTERN_ARABIC_DIGITS.indexOf(digit)));

export const resolveNumericLocale = (locale = 'en', fallback = 'en-US') => {
  const normalized = String(locale || '').toLowerCase();
  const base = normalized.startsWith('ar')
    ? 'ar-JO'
    : normalized.startsWith('en')
    ? 'en-US'
    : fallback;
  return `${base}-u-nu-latn`;
};

export const normalizeNumericInput = (value) => toEnglishDigits(value).replace(/\s+/g, '');
