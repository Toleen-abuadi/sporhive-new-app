import { useCallback, useMemo, useState } from 'react';
import { mapPaymentsFromOverview } from '../api/playerPortal.mapper';
import { usePlayerOverview } from './usePlayerOverview';

export const PLAYER_PAYMENT_FILTERS = Object.freeze({
  ALL: 'all',
  PENDING: 'pending',
  PAID: 'paid',
});

const DEFAULT_PAYMENTS = Object.freeze({
  items: [],
  latest: null,
  summary: {
    totalCount: 0,
    pendingCount: 0,
    paidCount: 0,
    totalPendingAmount: 0,
    totalPaidAmount: 0,
  },
});

const applyPaymentFilter = (items, filterKey) => {
  if (filterKey === PLAYER_PAYMENT_FILTERS.PAID) {
    return items.filter((item) => item.status === 'paid');
  }

  if (filterKey === PLAYER_PAYMENT_FILTERS.PENDING) {
    return items.filter((item) => item.status !== 'paid');
  }

  return items;
};

export function usePlayerPayments({ enabled = true } = {}) {
  const [filter, setFilter] = useState(PLAYER_PAYMENT_FILTERS.ALL);
  const overviewQuery = usePlayerOverview({ auto: enabled, enabled });

  const payments = useMemo(() => {
    if (!overviewQuery.overview?.raw) return DEFAULT_PAYMENTS;

    try {
      return mapPaymentsFromOverview(overviewQuery.overview.raw);
    } catch {
      return DEFAULT_PAYMENTS;
    }
  }, [overviewQuery.overview?.raw]);

  const items = useMemo(
    () => applyPaymentFilter(payments.items, filter),
    [filter, payments.items]
  );

  const getPaymentById = useCallback(
    (paymentId) => payments.items.find((item) => String(item.id) === String(paymentId)) || null,
    [payments.items]
  );

  return {
    ...overviewQuery,
    filter,
    setFilter,
    filters: PLAYER_PAYMENT_FILTERS,
    payments: items,
    allPayments: payments.items,
    latestPayment: payments.latest,
    paymentSummary: payments.summary,
    getPaymentById,
  };
}
