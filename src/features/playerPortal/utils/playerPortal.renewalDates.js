const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isISODate = (value) => ISO_DATE_RE.test(String(value || ''));

export const toLocalISODate = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDaysToISODate = (isoDate, days) => {
  if (!isISODate(isoDate)) return '';

  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return '';

  date.setDate(date.getDate() + Number(days || 0));
  return toLocalISODate(date);
};

export const maxISODate = (left, right) => {
  if (!left) return right || '';
  if (!right) return left || '';
  return left >= right ? left : right;
};

export const minISODate = (left, right) => {
  if (!left) return right || '';
  if (!right) return left || '';
  return left <= right ? left : right;
};

export const clampISODate = (value, minDate, maxDate) => {
  const normalized = isISODate(value) ? value : '';
  if (!normalized) return '';

  const maxBounded = maxISODate(normalized, minDate || '');
  const minBounded = minISODate(maxBounded, maxDate || '');
  return minBounded;
};

export const getNextRenewalStartDate = (
  currentRegistration = {},
  requestedStartDate = null,
  today = new Date()
) => {
  const todayISO = isISODate(today) ? today : toLocalISODate(today);
  const requestedISO = isISODate(requestedStartDate) ? requestedStartDate : '';
  const fallbackISO = requestedISO || todayISO;
  const currentEndISO = isISODate(currentRegistration?.end_date)
    ? currentRegistration.end_date
    : isISODate(currentRegistration?.endDate)
    ? currentRegistration.endDate
    : '';

  if (!currentEndISO) return fallbackISO;

  const nextStartISO = addDaysToISODate(currentEndISO, 1);
  return maxISODate(nextStartISO, todayISO) || fallbackISO;
};
