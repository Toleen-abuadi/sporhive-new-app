import { toEnglishDigits } from '../../../utils/numbering';
import { normalizeFreezePhase, normalizeFreezeStatus } from './playerPortal.freezeStatus';

const cleanString = (value) => {
  if (value == null) return '';
  return toEnglishDigits(String(value).trim());
};

export const toObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
};

export const toArray = (value) => (Array.isArray(value) ? value : []);

export const toNumber = (value) => {
  if (value == null || value === '') return null;
  const numeric = Number(toEnglishDigits(value));
  return Number.isFinite(numeric) ? numeric : null;
};

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isNumericString = (value) => {
  if (typeof value !== 'string') return false;
  const normalized = toEnglishDigits(value).trim();
  return normalized !== '' && /^-?\d+(\.\d+)?$/.test(normalized);
};

const normalizePortalFieldValue = (key, value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const fieldName = String(key || '').toLowerCase();
  const numericFieldPattern = /(^id$|_id$|(^|_)id(_|$)|tryout|player_id|external_player_id|academy_id|customer_id|limit|offset|count)$/;
  if (numericFieldPattern.test(fieldName) && isNumericString(value)) {
    const numeric = Number(toEnglishDigits(value));
    return Number.isFinite(numeric) ? numeric : value;
  }

  return value;
};

const stripUndefinedDeep = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedDeep(item))
      .filter((item) => item !== undefined);
  }

  if (!isPlainObject(value)) return value;

  return Object.entries(value).reduce((acc, [key, entry]) => {
    const normalized = stripUndefinedDeep(entry);
    if (normalized !== undefined) {
      acc[key] = normalized;
    }
    return acc;
  }, {});
};

export const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  const normalized = cleanString(value).toLowerCase();
  if (!normalized) return false;
  return ['1', 'true', 'yes', 'active'].includes(normalized);
};

export const buildPortalPayload = (payload = {}, context = {}, options = {}) => {
  const { includePlayerId = true } = options;
  const basePayload = stripUndefinedDeep(toObject(payload));
  const academyId = toNumber(context?.academyId ?? context?.customerId);

  if (academyId != null) {
    if (!Object.prototype.hasOwnProperty.call(basePayload, 'academy_id')) {
      basePayload.academy_id = academyId;
    }
    if (!Object.prototype.hasOwnProperty.call(basePayload, 'customer_id')) {
      basePayload.customer_id = academyId;
    }
  }

  if (includePlayerId !== false) {
    const tryoutId = toNumber(context?.tryoutId ?? context?.externalPlayerId);
    if (tryoutId != null) {
      ['tryout_id', 'try_out', 'player_id', 'external_player_id'].forEach((field) => {
        if (!Object.prototype.hasOwnProperty.call(basePayload, field)) {
          basePayload[field] = tryoutId;
        }
      });
    }
  }

  return stripUndefinedDeep(
    Object.entries(basePayload).reduce((acc, [key, value]) => {
      if (value === undefined) return acc;
      const normalized = normalizePortalFieldValue(key, value);
      if (normalized !== undefined) {
        acc[key] = normalized;
      }
      return acc;
    }, {})
  );
};

export const normalizePagination = (payload = {}) => {
  const root = toObject(payload);
  const data = toObject(root.data);
  const pagination = toObject(root.pagination || data.pagination || root.meta || data.meta);
  const rows =
    toArray(root.rows).length > 0
      ? toArray(root.rows)
      : toArray(data.rows).length > 0
      ? toArray(data.rows)
      : toArray(root.items).length > 0
      ? toArray(root.items)
      : toArray(data.items).length > 0
      ? toArray(data.items)
      : toArray(root.results).length > 0
      ? toArray(root.results)
      : toArray(data.results);

  const countCandidates = [
    root.count,
    data.count,
    pagination.count,
    root.total,
    data.total,
    pagination.total,
    root.total_count,
    data.total_count,
    root.totalCount,
    data.totalCount,
  ]
    .map(toNumber)
    .filter((value) => value != null);

  const limitCandidates = [root.limit, data.limit, pagination.limit, root.page_size, data.page_size]
    .map(toNumber)
    .filter((value) => value != null);
  const offsetCandidates = [root.offset, data.offset, pagination.offset, root.skip, data.skip]
    .map(toNumber)
    .filter((value) => value != null);

  return {
    count: countCandidates[0] != null ? countCandidates[0] : rows.length,
    limit: limitCandidates[0] != null ? limitCandidates[0] : null,
    offset: offsetCandidates[0] != null ? offsetCandidates[0] : null,
    next: cleanString(root.next || data.next || pagination.next) || null,
    previous: cleanString(root.previous || data.previous || pagination.previous) || null,
  };
};

const normalizeRatingTypeRow = (item) => {
  const row = toObject(item);
  const key = cleanString(row.key || row.id || row.value || row.rating_type);
  if (!key) return null;

  const labelEn = cleanString(row.label_en || row.labelEn || row.name_en || row.nameEn || row.label || key);
  const labelAr = cleanString(row.label_ar || row.labelAr || row.name_ar || row.nameAr || row.label || key);

  return {
    key,
    labelEn: labelEn || key,
    labelAr: labelAr || key,
    label_en: labelEn || key,
    label_ar: labelAr || key,
    raw: row,
  };
};

export const normalizeRatingTypes = (payload = {}) => {
  const root = toObject(payload);
  const data = toObject(root.data);
  const source = [
    ...toArray(root.rating_types),
    ...toArray(data.rating_types),
    ...toArray(root.types),
    ...toArray(data.types),
    ...toArray(root.criteria),
    ...toArray(data.criteria),
  ];

  const items = source
    .map(normalizeRatingTypeRow)
    .filter(Boolean)
    .reduce(
      (acc, item) => {
        if (acc.seen.has(item.key)) return acc;
        acc.seen.add(item.key);
        acc.items.push(item);
        return acc;
      },
      { seen: new Set(), items: [] }
    ).items;

  return {
    items,
    types: items,
    criteria: items,
    raw: root,
  };
};

const normalizeIsoDate = (value) => {
  const raw = cleanString(value);
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const pickFirstValue = (...values) => {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value == null || value === '') continue;
    return value;
  }
  return null;
};

const pickFirstString = (...values) => {
  const value = pickFirstValue(...values);
  return value == null ? '' : cleanString(value);
};

const normalizePhoneValue = (phones, key) => {
  if (!phones) return '';
  if (typeof phones === 'string') return cleanString(phones);
  if (typeof phones !== 'object') return '';
  return pickFirstString(phones[key], phones[String(key)]);
};

const normalizePlayerInfo = (source) => {
  const data = toObject(source);
  const phoneNumbers = toObject(data.phone_numbers);

  const firstEngName = pickFirstString(data.first_eng_name, data.first_name);
  const middleEngName = pickFirstString(data.middle_eng_name, data.middle_name);
  const lastEngName = pickFirstString(data.last_eng_name, data.last_name);
  const firstArName = pickFirstString(data.first_ar_name);
  const middleArName = pickFirstString(data.middle_ar_name);
  const lastArName = pickFirstString(data.last_ar_name);

  return {
    id: toNumber(pickFirstValue(data.id, data.tryout_id, data.try_out, data.player_id, data.external_player_id)),
    firstEngName,
    middleEngName,
    lastEngName,
    firstArName,
    middleArName,
    lastArName,
    phone1: pickFirstString(normalizePhoneValue(phoneNumbers, 1), data.phone1, data.phone),
    phone2: pickFirstString(normalizePhoneValue(phoneNumbers, 2), data.phone2),
    dateOfBirth: normalizeIsoDate(data.date_of_birth),
    email: pickFirstString(data.email),
    createdAt: cleanString(data.created_at),
    phoneNumbers,
  };
};

const normalizeRegistrationInfo = (source) => {
  const data = toObject(source);
  const group = toObject(data.group);
  const course = toObject(data.course);
  const groupCourse = toObject(group.course);

  return {
    id: toNumber(data.id),
    registrationType: pickFirstString(data.registration_type, data.type),
    level: pickFirstString(data.level),
    startDate: normalizeIsoDate(data.start_date),
    endDate: normalizeIsoDate(data.end_date),
    numberOfSessions: toNumber(data.number_of_sessions),
    address: pickFirstString(data.address),
    createdAt: cleanString(data.created_at),
    subscriptionStatus: toBoolean(data.subscription_status),
    group: {
      id: toNumber(group.id),
      courseId: toNumber(group.course_id || group.courseId || groupCourse.id),
      name: pickFirstString(group.name, group.group_name),
      schedule: toArray(
        group.schedule ||
          group.group_schedule ||
          group.training_days ||
          group.days ||
          group.raw?.schedule
      ),
      whatsappUrl: pickFirstString(group.whatsapp_url),
      isActive: group.is_active !== false,
      capacity: toNumber(group.capacity),
      raw: group,
    },
    course: {
      id: toNumber(course.id),
      name: pickFirstString(course.name, course.course_name),
      startDate: normalizeIsoDate(course.start_date),
      endDate: normalizeIsoDate(course.end_date),
      numberOfSessions: toNumber(course.num_of_sessions),
      raw: course,
    },
    availableCourses: toArray(data.available_courses).map((item) => {
      const entry = toObject(item);
      return {
        id: toNumber(entry.id),
        name: pickFirstString(entry.name, entry.course_name),
        startDate: normalizeIsoDate(entry.start_date),
        endDate: normalizeIsoDate(entry.end_date),
        numberOfSessions: toNumber(entry.num_of_sessions),
        raw: entry,
      };
    }),
    availableGroups: toArray(data.available_groups).map((item) => {
      const entry = toObject(item);
      const entryCourse = toObject(entry.course);
      return {
        id: toNumber(entry.id),
        courseId: toNumber(entry.course_id || entry.courseId || entryCourse.id),
        name: pickFirstString(entry.name, entry.group_name),
        schedule: toArray(
          entry.schedule ||
            entry.group_schedule ||
            entry.training_days ||
            entry.days ||
            entry.raw?.schedule
        ),
        isActive: entry.is_active !== false,
        capacity: toNumber(entry.capacity),
        raw: entry,
      };
    }),
  };
};

const normalizeHealthInfo = (source) => {
  const data = toObject(source);
  return {
    height: toNumber(data.height),
    weight: toNumber(data.weight),
    timestamp: cleanString(data.timestamp),
  };
};

const normalizeProfileImage = (source) => {
  const data = toObject(source);
  return {
    image: cleanString(data.image),
    imageType: pickFirstString(data.image_type),
    imageSize: toNumber(data.image_size),
  };
};

const normalizePaymentStatus = (status) => {
  const value = cleanString(status).toLowerCase();
  return value || 'pending';
};

const normalizePaymentInfo = (source) => {
  const data = toObject(source);
  return {
    id: toNumber(data.id),
    type: pickFirstString(data.type),
    subType: pickFirstString(data.sub_type),
    status: normalizePaymentStatus(data.status),
    amount: pickFirstString(data.amount, '0'),
    currency: pickFirstString(data.currency, data.currency_code, 'JD'),
    dueDate: normalizeIsoDate(data.due_date),
    paidOn: normalizeIsoDate(data.paid_on),
    paymentMethod: pickFirstString(data.payment_method),
    invoiceId: pickFirstString(data.invoice_id),
    externalInvoiceNumber: pickFirstString(data.external_invoice_number),
    useCredits: toBoolean(data.use_credits),
    creditsUsed: pickFirstString(data.credits_used, '0'),
    createdAt: cleanString(data.created_at),
    fees: toObject(data.fees),
  };
};

const normalizeSubscriptionHistory = (source) => {
  const data = toObject(source);
  return {
    id: toNumber(data.id),
    numberOfSessions: toNumber(data.number_of_sessions),
    startDate: normalizeIsoDate(data.start_date),
    endDate: normalizeIsoDate(data.end_date),
    createdAt: normalizeIsoDate(data.created_at),
    log: toObject(data.log),
  };
};

const normalizeCredits = (source) => {
  const data = toObject(source);
  const activeRows = toArray(data.active).map((item) => {
    const row = toObject(item);
    return {
      remaining: pickFirstString(row.remaining, '0'),
      endAt: normalizeIsoDate(row.end_at),
      source: pickFirstString(row.source),
      reason: pickFirstString(row.reason),
    };
  });

  return {
    active: activeRows,
    activeCount: activeRows.length,
    totalCreditRemaining: pickFirstString(data.total_credit_remaining, '0'),
    nextCreditExpiry: normalizeIsoDate(data.next_credit_expiry),
  };
};

const normalizeFreeze = (source) => {
  const data = toObject(source);
  return {
    id: toNumber(data.id),
    status: normalizeFreezeStatus(data.status, data.phase),
    phase: normalizeFreezePhase(data.phase) || normalizeFreezePhase(data.status),
    startDate: normalizeIsoDate(data.start_date),
    endDate: normalizeIsoDate(data.end_date),
    reason: pickFirstString(data.reason),
  };
};

const normalizePerformanceFeedback = (source) => {
  const data = toObject(source);
  const metrics = toObject(data.metrics);
  return {
    summary: pickFirstString(data.summary, 'Performance summary unavailable.'),
    totalSessions: toNumber(metrics.total_sessions),
    elapsedSessions: toNumber(metrics.elapsed_sessions),
    remainingSessions: toNumber(metrics.remaining_sessions),
    freezingCounts: toObject(metrics.freezing_counts),
    currentFreeze: normalizeFreeze(metrics.current_freeze),
    upcomingFreeze: normalizeFreeze(metrics.upcoming_freeze),
    lastFreeze: normalizeFreeze(metrics.last_freeze),
    credits: normalizeCredits(metrics.credits),
  };
};

const pickLatestPayment = (payments) => {
  const sorted = [...payments].sort((left, right) => {
    const rightDate = new Date(right.paidOn || right.createdAt || right.dueDate || 0).getTime();
    const leftDate = new Date(left.paidOn || left.createdAt || left.dueDate || 0).getTime();
    return rightDate - leftDate;
  });
  return sorted[0] || null;
};

export function normalizeOverviewData(source) {
  const root = toObject(source);
  const playerData =
    toObject(root.player_data) || toObject(root.data?.player_data) || toObject(root.playerData);

  const playerInfo = normalizePlayerInfo(playerData.player_info);
  const registrationInfo = normalizeRegistrationInfo(playerData.registration_info);
  const healthInfo = normalizeHealthInfo(playerData.health_info);
  const profileImage = normalizeProfileImage(playerData.profile_image);
  const payments = toArray(playerData.payment_info).map(normalizePaymentInfo);
  const latestPayment = pickLatestPayment(payments);
  const subscriptionHistory = toArray(playerData.subscription_history).map(normalizeSubscriptionHistory);
  const credits = normalizeCredits(playerData.credits);
  const performanceFeedback = normalizePerformanceFeedback(playerData.performance_feedback);
  const levels = toArray(playerData.levels || root.levels);

  return {
    academyName: pickFirstString(root.academy_name, root.academyName),
    playerInfo,
    registrationInfo,
    healthInfo,
    profileImage,
    paymentInfo: payments,
    latestPayment,
    subscriptionHistory,
    credits,
    performanceFeedback,
    levels,
    raw: root,
    playerDataRaw: playerData,
  };
}

export function normalizeProxyCollection(source, primaryKey = 'data') {
  const root = toObject(source);
  const scoped =
    toObject(root[primaryKey]) ||
    toObject(root.data) ||
    toObject(root.results) ||
    toObject(root.payload);

  const listCandidates = [
    root.items,
    scoped.items,
    scoped.results,
    scoped.news,
    root.news,
    root.results,
  ];
  const prioritized =
    listCandidates.find((entry) => Array.isArray(entry) && entry.length > 0) ||
    listCandidates.find((entry) => Array.isArray(entry)) ||
    [];
  const list = toArray(prioritized);

  return {
    root,
    scoped,
    list,
  };
}
