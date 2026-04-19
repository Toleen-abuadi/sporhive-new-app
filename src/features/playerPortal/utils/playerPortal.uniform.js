import { toNumber } from './playerPortal.normalizers';
import { normalizeApiEnumValue } from '../../../utils/apiValueLocalization';

const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

export const UNIFORM_STATUS_FLOW = Object.freeze([
  'pending_payment',
  'paid',
  'received',
  'printed',
  'received_and_player_notified',
  'collected',
]);

export const STATUS_ORDER = UNIFORM_STATUS_FLOW;

const ORDER_STATUS_TO_FLOW = Object.freeze({
  pending: 'pending_payment',
  pending_payment: 'pending_payment',
  unpaid: 'pending_payment',
  due: 'pending_payment',
  overdue: 'pending_payment',
  partial: 'pending_payment',
  processing: 'pending_payment',
  under_review: 'pending_payment',
  paid: 'paid',
  active: 'paid',
  valid: 'paid',
  received_by_printing_place: 'received',
  received_by_printing: 'received',
  printing_place_received: 'received',
  printshop_received: 'received',
  received: 'received',
  printed: 'printed',
  print_completed: 'printed',
  print_complete: 'printed',
  completed_printing: 'printed',
  ready: 'received_and_player_notified',
  notified: 'received_and_player_notified',
  player_notified: 'received_and_player_notified',
  received_and_player_notified: 'received_and_player_notified',
  completed: 'collected',
  collected: 'collected',
});

export const normalizeUniformStatus = (status) => {
  const normalized = normalizeApiEnumValue(status);
  if (!normalized) return 'pending_payment';
  return ORDER_STATUS_TO_FLOW[normalized] || normalized;
};

export const getUniformStatusStepIndex = (status) => {
  const normalized = normalizeUniformStatus(status);
  const index = STATUS_ORDER.findIndex((item) => item === normalized);
  return index < 0 ? 0 : index;
};

export const compareUniformStatusProgress = (leftStatus, rightStatus) =>
  getUniformStatusStepIndex(leftStatus) - getUniformStatusStepIndex(rightStatus);

export const isUniformStatusReached = (currentStatus, targetStatus) =>
  compareUniformStatusProgress(currentStatus, targetStatus) >= 0;

export const getUniformSizeLabel = (size, t) => {
  const value = cleanString(size);
  if (!value) return '-';
  if (value.toLowerCase() === 'one_size') return t('playerPortal.store.labels.oneSize');
  return value;
};

export const getUniformProductName = (product, locale = 'en') => {
  const item = product || {};
  if (String(locale).toLowerCase().startsWith('ar')) {
    return cleanString(item.nameAr || item.nameEn || item.productName);
  }
  return cleanString(item.nameEn || item.nameAr || item.productName);
};

export const buildUniformOrderPayload = ({
  cartItems = [],
  printing = {},
  tryoutId = null,
} = {}) => {
  const details = cartItems
    .map((item) => ({
      variant_id: toNumber(item.variantId),
      product_id: toNumber(item.productId),
      size: cleanString(item.size),
      uniform_quantity: Math.max(1, toNumber(item.quantity) || 1),
    }))
    .filter((item) => item.variant_id != null);

  const rawPlayerNumber = cleanString(printing.playerNumber);
  const playerNumber = rawPlayerNumber ? Number(rawPlayerNumber) : null;

  return {
    try_out: toNumber(tryoutId),
    uniform_details: details,
    uniform_player_number: Number.isFinite(playerNumber) ? playerNumber : null,
    uniform_nickname: cleanString(printing.nickname),
  };
};

export const validateUniformCheckout = ({
  cartItems = [],
  productMap = {},
  printing = {},
} = {}) => {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    errors.push('cart_empty');
    return { valid: false, errors, warnings };
  }

  cartItems.forEach((item) => {
    const qty = Math.max(1, toNumber(item.quantity) || 1);
    const product = productMap[item.productId];
    if (!product) {
      errors.push('product_missing');
      return;
    }

    const variant = (product.variants || []).find((entry) => Number(entry.id) === Number(item.variantId));
    if (!variant) {
      errors.push('variant_missing');
      return;
    }

    if (!variant.inStock || (toNumber(variant.quantity) || 0) <= 0) {
      errors.push('variant_out_of_stock');
      return;
    }

    if (qty > (toNumber(variant.quantity) || 0)) {
      errors.push('quantity_exceeds_stock');
    }
  });

  const hasPrintingItem = cartItems.some((item) => Boolean(item.needPrinting));
  if (hasPrintingItem) {
    const playerNumber = cleanString(printing.playerNumber);
    if (playerNumber && !/^\d{1,6}$/.test(playerNumber)) {
      warnings.push('printing_number_invalid');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};
