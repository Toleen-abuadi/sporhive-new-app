export function getRowDirection(isRTL) {
  return isRTL ? 'row-reverse' : 'row';
}

export function getWritingDirection(isRTL) {
  return isRTL ? 'rtl' : 'ltr';
}

export function getTextAlign(isRTL, align = 'start') {
  if (align === 'center') return 'center';
  if (align === 'end') return isRTL ? 'left' : 'right';
  return isRTL ? 'right' : 'left';
}

export function directionalStyle(isRTL, ltrStyle, rtlStyle) {
  return isRTL ? rtlStyle : ltrStyle;
}
