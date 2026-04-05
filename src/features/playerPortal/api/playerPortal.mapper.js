import { normalizeOverviewData, normalizeProxyCollection, toArray, toNumber, toObject } from '../utils/playerPortal.normalizers';
import { mapFreezeRows } from '../utils/playerPortal.freeze';

const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const joinName = (...parts) =>
  parts
    .map((item) => cleanString(item))
    .filter(Boolean)
    .join(' ')
    .trim();

const extractSubscriptionStatus = (normalized) => {
  if (normalized.registrationInfo.subscriptionStatus) return 'active';
  const status = cleanString(normalized.latestPayment?.status || normalized.registrationInfo?.status).toLowerCase();
  if (status) return status;
  return 'inactive';
};

export function mapOverviewResponse(payload) {
  const normalized = normalizeOverviewData(payload);
  const englishName = joinName(
    normalized.playerInfo.firstEngName,
    normalized.playerInfo.middleEngName,
    normalized.playerInfo.lastEngName
  );
  const arabicName = joinName(
    normalized.playerInfo.firstArName,
    normalized.playerInfo.middleArName,
    normalized.playerInfo.lastArName
  );
  const displayName = englishName || arabicName || 'Player';
  const subscriptionStatus = extractSubscriptionStatus(normalized);

  const performanceCredits = normalized.performanceFeedback.credits.totalCreditRemaining;
  const creditsTotal = normalized.credits.totalCreditRemaining || performanceCredits || '0';
  const totalSessions =
    normalized.performanceFeedback.totalSessions || normalized.registrationInfo.numberOfSessions || 0;
  const remainingSessions =
    normalized.performanceFeedback.remainingSessions != null
      ? normalized.performanceFeedback.remainingSessions
      : normalized.registrationInfo.numberOfSessions;

  return {
    academyName: normalized.academyName,
    player: {
      id: normalized.playerInfo.id,
      displayName,
      englishName,
      arabicName,
      phone: normalized.playerInfo.phone1 || normalized.playerInfo.phone2,
      email: normalized.playerInfo.email,
      dateOfBirth: normalized.playerInfo.dateOfBirth,
    },
    subscription: {
      id: normalized.registrationInfo.id,
      currentRegId: normalized.registrationInfo.id,
      status: subscriptionStatus,
      registrationType: normalized.registrationInfo.registrationType,
      level: normalized.registrationInfo.level,
      startDate: normalized.registrationInfo.startDate,
      endDate: normalized.registrationInfo.endDate,
      numberOfSessions: normalized.registrationInfo.numberOfSessions,
      groupId: normalized.registrationInfo.group.id,
      courseId: normalized.registrationInfo.course.id,
      courseName: normalized.registrationInfo.course.name,
      groupName: normalized.registrationInfo.group.name,
      availableCourses: normalized.registrationInfo.availableCourses,
      availableGroups: normalized.registrationInfo.availableGroups,
    },
    credits: {
      ...normalized.credits,
      totalCreditRemaining: creditsTotal,
      activeCount: normalized.credits.activeCount,
    },
    payments: normalized.paymentInfo,
    latestPayment: normalized.latestPayment,
    performance: {
      ...normalized.performanceFeedback,
      totalSessions,
      remainingSessions: remainingSessions == null ? null : Number(remainingSessions),
    },
    health: normalized.healthInfo,
    profileImage: normalized.profileImage,
    levels: normalized.levels,
    summaries: {
      sessionsRemaining: remainingSessions == null ? null : Number(remainingSessions),
      totalSessions,
      creditBalance: creditsTotal,
      nextCreditExpiry: normalized.credits.nextCreditExpiry || normalized.performanceFeedback.credits.nextCreditExpiry,
      latestPaymentStatus: cleanString(normalized.latestPayment?.status || 'pending'),
    },
    raw: normalized.raw,
    playerDataRaw: normalized.playerDataRaw,
  };
}

export function mapProfileFromOverview(overview) {
  const source = toObject(overview);
  const player = toObject(source.player);
  const health = toObject(source.health);
  const profileImage = toObject(source.profileImage);

  return {
    id: toNumber(player.id),
    first_eng_name: cleanString(source.raw?.player_data?.player_info?.first_eng_name),
    middle_eng_name: cleanString(source.raw?.player_data?.player_info?.middle_eng_name),
    last_eng_name: cleanString(source.raw?.player_data?.player_info?.last_eng_name),
    first_ar_name: cleanString(source.raw?.player_data?.player_info?.first_ar_name),
    middle_ar_name: cleanString(source.raw?.player_data?.player_info?.middle_ar_name),
    last_ar_name: cleanString(source.raw?.player_data?.player_info?.last_ar_name),
    phone1: cleanString(source.raw?.player_data?.player_info?.phone_numbers?.['1'] || player.phone),
    phone2: cleanString(source.raw?.player_data?.player_info?.phone_numbers?.['2']),
    date_of_birth: cleanString(player.dateOfBirth),
    address: cleanString(source.raw?.player_data?.registration_info?.address),
    google_maps_location: cleanString(source.raw?.player_data?.registration_info?.google_maps_location),
    weight: health.weight,
    height: health.height,
    image: cleanString(profileImage.image),
    image_type: cleanString(profileImage.imageType),
    image_size: toNumber(profileImage.imageSize),
  };
}

export function mapProfileGetResponse(payload) {
  const root = toObject(payload);
  const profile = toObject(root.profile || root.data?.profile || root.data || root.player);
  const phoneNumbers = toObject(profile.phone_numbers || profile.phoneNumbers);

  return {
    id: toNumber(profile.id || profile.try_out || profile.tryout_id || profile.player_id),
    first_eng_name: cleanString(profile.first_eng_name),
    middle_eng_name: cleanString(profile.middle_eng_name),
    last_eng_name: cleanString(profile.last_eng_name),
    first_ar_name: cleanString(profile.first_ar_name),
    middle_ar_name: cleanString(profile.middle_ar_name),
    last_ar_name: cleanString(profile.last_ar_name),
    phone1: cleanString(profile.phone1 || phoneNumbers['1']),
    phone2: cleanString(profile.phone2 || phoneNumbers['2']),
    date_of_birth: cleanString(profile.date_of_birth),
    address: cleanString(profile.address),
    google_maps_location: cleanString(profile.google_maps_location),
    weight: profile.weight == null ? null : Number(profile.weight),
    height: profile.height == null ? null : Number(profile.height),
    image: cleanString(profile.image),
    image_type: cleanString(profile.image_type),
    image_size: toNumber(profile.image_size),
    raw: root,
  };
}

export function mapProfileUpdateResponse(payload) {
  const root = toObject(payload);
  return {
    success: !cleanString(root.error),
    message: cleanString(root.message || root.detail || (cleanString(root.error) ? '' : 'Profile updated')),
    error: cleanString(root.error),
    raw: root,
  };
}

const normalizeNewsImage = (image) => {
  const item = toObject(image);
  return {
    id: toNumber(item.id || item.image_id),
    url: cleanString(item.image_url || item.url || item.path),
  };
};

const normalizeNewsItem = (item) => {
  const row = toObject(item);
  const images = toArray(row.images || row.news_images || row.media).map(normalizeNewsImage);
  const body = cleanString(row.content || row.description || row.body || row.summary);
  return {
    id: toNumber(row.id || row.news_id),
    title: cleanString(row.title || row.name || row.headline),
    body,
    preview: body.length > 180 ? `${body.slice(0, 177).trimEnd()}...` : body,
    publishedAt: cleanString(row.published_at || row.date || row.created_at),
    images,
    image: images[0] || null,
    raw: row,
  };
};

export function mapNewsListResponse(payload) {
  const normalized = normalizeProxyCollection(payload);
  const scopedListCandidates = [
    normalized.list,
    toArray(normalized.scoped.news),
    toArray(normalized.scoped.results),
    toArray(normalized.root.news),
    toArray(normalized.root.results),
    toArray(normalized.root.data),
  ];

  const sourceList = scopedListCandidates.find((entries) => Array.isArray(entries) && entries.length > 0) || [];
  const items = sourceList.map(normalizeNewsItem).filter((entry) => entry.id != null || entry.title);
  const totalCandidates = [
    toNumber(normalized.scoped.total_count),
    toNumber(normalized.root.total_count),
    toNumber(normalized.scoped.total),
    toNumber(normalized.root.total),
  ].filter((value) => value != null);

  return {
    items,
    total: totalCandidates[0] != null ? totalCandidates[0] : items.length,
    raw: normalized.root,
  };
}

const normalizePaymentAmount = (amount) => {
  const numeric = toNumber(amount);
  if (numeric == null) return 0;
  return numeric;
};

const normalizePaymentStatus = (status) => {
  const value = cleanString(status).toLowerCase();
  return value || 'pending';
};

const pickPaymentDate = (payment) =>
  cleanString(payment?.paidOn || payment?.dueDate || payment?.createdAt);

const sortPaymentsDesc = (payments) =>
  [...payments].sort((left, right) => {
    const rightDate = new Date(pickPaymentDate(right) || 0).getTime();
    const leftDate = new Date(pickPaymentDate(left) || 0).getTime();
    return rightDate - leftDate;
  });

const normalizePaymentRow = (payment) => {
  const row = toObject(payment);
  const status = normalizePaymentStatus(row.status);
  const type = cleanString(row.type || 'payment');
  const subType = cleanString(row.subType);
  const invoiceId = cleanString(row.invoiceId || row.externalInvoiceNumber || row.reference);
  const amountNumber = normalizePaymentAmount(row.amount);
  const creditsUsed = normalizePaymentAmount(row.creditsUsed);
  const canPrintInvoice = status === 'paid' || Boolean(invoiceId);

  return {
    id: toNumber(row.id),
    type,
    subType,
    label: subType ? `${type} / ${subType}` : type,
    status,
    amount: cleanString(row.amount || amountNumber || '0'),
    amountNumber,
    dueDate: cleanString(row.dueDate),
    paidOn: cleanString(row.paidOn),
    paymentMethod: cleanString(row.paymentMethod),
    invoiceId,
    externalInvoiceNumber: cleanString(row.externalInvoiceNumber),
    creditsUsed,
    useCredits: Boolean(row.useCredits) || creditsUsed > 0,
    fees: toObject(row.fees),
    createdAt: cleanString(row.createdAt),
    canPrintInvoice,
    raw: row.raw || row,
  };
};

const summarizePayments = (payments) => {
  const rows = toArray(payments);
  const pending = rows.filter((item) => item.status === 'pending');
  const paid = rows.filter((item) => item.status === 'paid');
  const totalPendingAmount = pending.reduce((sum, item) => sum + normalizePaymentAmount(item.amount), 0);
  const totalPaidAmount = paid.reduce((sum, item) => sum + normalizePaymentAmount(item.amount), 0);

  return {
    totalCount: rows.length,
    pendingCount: pending.length,
    paidCount: paid.length,
    totalPendingAmount,
    totalPaidAmount,
  };
};

export function mapPaymentsFromOverview(overviewPayload) {
  const overview = mapOverviewResponse(overviewPayload);
  const rows = sortPaymentsDesc(toArray(overview.payments).map(normalizePaymentRow));

  return {
    items: rows,
    latest: rows[0] || null,
    summary: summarizePayments(rows),
    raw: overview.raw,
  };
}

export function mapPaymentFromOverviewById(overviewPayload, paymentId) {
  const targetId = toNumber(paymentId);
  const mapped = mapPaymentsFromOverview(overviewPayload);
  const item = mapped.items.find((entry) => entry.id === targetId) || null;
  return {
    item,
    summary: mapped.summary,
    raw: mapped.raw,
  };
}

const mapFeedbackType = (item) => {
  const row = toObject(item);
  const key = cleanString(row.key || row.id || row.rating_type);
  return {
    key,
    labelEn: cleanString(row.label_en || key),
    labelAr: cleanString(row.label_ar || key),
    raw: row,
  };
};

export function mapFeedbackTypesResponse(payload) {
  const root = toObject(payload);
  const rows = toArray(root.rating_types || root.types || root.data?.rating_types)
    .map(mapFeedbackType)
    .filter((item) => item.key);

  return {
    items: rows,
    raw: root,
  };
}

const mapFeedbackRecentItem = (item) => {
  const row = toObject(item);
  const ratingValue = toNumber(row.rating_value);
  const percentage =
    toNumber(row.percentage) != null ? toNumber(row.percentage) : ratingValue != null ? Math.round((ratingValue / 5) * 100) : 0;

  return {
    id: toNumber(row.id),
    attendanceId: toNumber(row.attendance_id),
    date: cleanString(row.date),
    ratingType: cleanString(row.rating_type),
    ratingValue: ratingValue == null ? 0 : ratingValue,
    percentage: percentage == null ? 0 : percentage,
    comment: cleanString(row.comment),
    raw: row,
  };
};

const mapOverallSummary = (source) => {
  const row = toObject(source);
  const avgValue = toNumber(row.avg_value);
  const avgPercentage = toNumber(row.avg_percentage);
  const safeAvgValue = avgValue == null ? 0 : avgValue;
  const safeAvgPercentage = avgPercentage == null ? Math.round((safeAvgValue / 5) * 100) : avgPercentage;

  return {
    avgValue: safeAvgValue,
    avgPercentage: safeAvgPercentage,
    count: toNumber(row.count) || 0,
  };
};

const mapRecentBreakdown = (recentItems = []) => {
  const groups = recentItems.reduce((acc, item) => {
    if (!item.ratingType) return acc;
    const current = acc[item.ratingType] || {
      key: item.ratingType,
      count: 0,
      totalValue: 0,
      totalPercentage: 0,
    };
    current.count += 1;
    current.totalValue += item.ratingValue || 0;
    current.totalPercentage += item.percentage || 0;
    acc[item.ratingType] = current;
    return acc;
  }, {});

  return Object.values(groups).map((row) => ({
    key: row.key,
    count: row.count,
    avgValue: row.count > 0 ? row.totalValue / row.count : 0,
    avgPercentage: row.count > 0 ? Math.round(row.totalPercentage / row.count) : 0,
  }));
};

export function mapFeedbackPlayerSummaryResponse(payload) {
  const root = toObject(payload);
  const scoped = toObject(root.data);
  const recent = toArray(root.recent || root.items || root.data?.recent).map(mapFeedbackRecentItem);
  const overall = mapOverallSummary(root.overall || root.data?.overall);

  return {
    tryoutId: toNumber(root.tryout_id || root.try_out || root.player_id || scoped.tryout_id || scoped.try_out || scoped.player_id),
    recent,
    overall,
    breakdown: mapRecentBreakdown(recent),
    notes: recent.filter((item) => item.comment).map((item) => ({ id: item.id, comment: item.comment, date: item.date })),
    raw: root,
  };
}

const mapPeriodRow = (item) => {
  const row = toObject(item);
  const avgValue = toNumber(row.avg_value);
  const avgPercentage = toNumber(row.avg_percentage);
  const safeValue = avgValue == null ? 0 : avgValue;
  const safePercentage = avgPercentage == null ? Math.round((safeValue / 5) * 100) : avgPercentage;
  return {
    date: cleanString(row.date || row.bucket || row.period),
    avgValue: safeValue,
    avgPercentage: safePercentage,
    count: toNumber(row.count) || 0,
    raw: row,
  };
};

export function mapFeedbackPeriodsResponse(payload) {
  const root = toObject(payload);
  const scoped = toObject(root.data);

  return {
    daily: toArray(root.daily || scoped.daily).map(mapPeriodRow),
    weekly: toArray(root.weekly || scoped.weekly).map(mapPeriodRow),
    monthly: toArray(root.monthly || scoped.monthly).map(mapPeriodRow),
    overall: mapOverallSummary(root.overall || scoped.overall),
    raw: root,
  };
}

const normalizeUniformSize = (value) => {
  const raw = cleanString(value);
  if (!raw) return '';
  if (raw.toLowerCase() === '__one_size__') return 'ONE_SIZE';
  return raw;
};

const buildUniformImageUri = (product) => {
  const row = toObject(product);
  const direct = cleanString(row.image || row.photo || row.photo_url || row.image_url);
  if (direct.startsWith('http') || direct.startsWith('data:image')) return direct;

  const base64 = cleanString(row.photo_base64);
  if (!base64) return '';
  const mime = cleanString(row.photo_mime || row.image_type) || 'image/jpeg';
  return `data:${mime};base64,${base64}`;
};

const mapUniformVariant = (variant) => {
  const row = toObject(variant);
  const quantity = Math.max(0, toNumber(row.quantity) || 0);
  const price = Math.max(0, toNumber(row.price) || 0);
  return {
    id: toNumber(row.id || row.variant_id),
    productId: toNumber(row.product_id || row.productId),
    size: normalizeUniformSize(row.size || row.uniform_size),
    price,
    quantity,
    inStock: quantity > 0,
    isActive: row.is_active !== false,
    lastQuantityUpdate: cleanString(row.last_quantity_update),
    raw: row,
  };
};

const mapUniformProduct = (product) => {
  const row = toObject(product);
  const variants = toArray(row.variants).map(mapUniformVariant).filter((item) => item.id != null);
  const sortedVariants = [...variants].sort((left, right) => {
    if (left.inStock !== right.inStock) return left.inStock ? -1 : 1;
    return left.price - right.price;
  });
  const prices = sortedVariants.map((item) => item.price).filter((value) => Number.isFinite(value));
  const quantities = sortedVariants.map((item) => item.quantity);
  const totalStock = quantities.reduce((sum, qty) => sum + qty, 0);

  return {
    id: toNumber(row.id || row.product_id),
    nameEn: cleanString(row.name_en || row.name || row.type),
    nameAr: cleanString(row.name_ar || row.label_ar),
    needPrinting: Boolean(row.need_printing),
    imageUri: buildUniformImageUri(row),
    variants: sortedVariants,
    startingPrice: prices.length ? Math.min(...prices) : 0,
    totalStock,
    hasStock: totalStock > 0,
    raw: row,
  };
};

export function mapUniformStoreResponse(payload) {
  const root = toObject(payload);
  const scoped = toObject(root.data);
  const products = toArray(scoped.products || root.products)
    .map(mapUniformProduct)
    .filter((item) => item.id != null);

  return {
    products,
    total: products.length,
    raw: root,
  };
}

const UNIFORM_STATUS_FLOW = [
  'pending_payment',
  'paid',
  'printed',
  'received',
  'received_and_player_notified',
  'collected',
];

const normalizeUniformOrderStatus = (status) => {
  const value = cleanString(status).toLowerCase();
  if (!value) return 'pending_payment';
  return value;
};

const statusRank = (status) => {
  const normalized = normalizeUniformOrderStatus(status);
  const foundIndex = UNIFORM_STATUS_FLOW.findIndex((item) => item === normalized);
  if (foundIndex >= 0) return foundIndex + 1;
  return 1;
};

const mapUniformOrderRow = (order) => {
  const row = toObject(order);
  return {
    id: toNumber(row.id),
    productId: toNumber(row.product_id || row.product?.id),
    variantId: toNumber(row.variant_id || row.variant?.id),
    productName: cleanString(
      row.uniform_type ||
        row.product_name ||
        row.product?.name_en ||
        row.product?.name ||
        row.name
    ),
    size: normalizeUniformSize(row.uniform_size || row.size),
    quantity: Math.max(1, toNumber(row.uniform_quantity || row.quantity) || 1),
    playerNumber: cleanString(row.player_number),
    nickname: cleanString(row.nickname),
    status: normalizeUniformOrderStatus(row.status),
    paymentRef: cleanString(row.additional_payment_ref || row.payment_ref || row.payment_id || row.id),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at),
    raw: row,
  };
};

const groupUniformOrders = (rows) => {
  const byRef = rows.reduce((acc, item) => {
    const key = cleanString(item.paymentRef || item.id || 'order');
    const current = acc[key] || {
      ref: key,
      items: [],
      highestStatusRank: 1,
      latestUpdatedAt: '',
      createdAt: item.createdAt || '',
    };
    current.items.push(item);
    const rank = statusRank(item.status);
    if (rank >= current.highestStatusRank) {
      current.highestStatusRank = rank;
      current.latestUpdatedAt = item.updatedAt || item.createdAt || current.latestUpdatedAt;
    }
    if (!current.createdAt && item.createdAt) {
      current.createdAt = item.createdAt;
    }
    acc[key] = current;
    return acc;
  }, {});

  return Object.values(byRef)
    .map((group) => ({
      ...group,
      status: UNIFORM_STATUS_FLOW[group.highestStatusRank - 1] || 'pending_payment',
      totalQuantity: group.items.reduce((sum, item) => sum + (toNumber(item.quantity) || 0), 0),
      itemCount: group.items.length,
    }))
    .sort((left, right) => {
      const rightTime = new Date(right.latestUpdatedAt || right.createdAt || 0).getTime();
      const leftTime = new Date(left.latestUpdatedAt || left.createdAt || 0).getTime();
      return rightTime - leftTime;
    });
};

export function mapUniformOrdersResponse(payload) {
  const root = toObject(payload);
  const scoped = toObject(root.data);
  const items = toArray(scoped.orders || root.orders).map(mapUniformOrderRow).filter((item) => item.id != null);
  const groups = groupUniformOrders(items);

  return {
    items,
    groups,
    total: groups.length,
    raw: root,
  };
}

export function mapUniformOrderCreateResponse(payload) {
  const root = toObject(payload);
  const scoped = toObject(root.data);
  const data = toObject(scoped.data || scoped);
  const rawOrders = data.orders || scoped.orders;
  const ordersPayload =
    Array.isArray(rawOrders)
      ? rawOrders
      : toArray(toObject(rawOrders).data || toObject(rawOrders).orders);
  const orders = ordersPayload.map(mapUniformOrderRow);

  return {
    message: cleanString(root.message || scoped.message || data.message || 'Order created'),
    paymentId: toNumber(
      data.payment?.id ||
        scoped.payment?.id ||
        data.payment_id ||
        scoped.payment_id ||
        data.additional_payment_ref
    ),
    feesId: toNumber(data.fees?.id || data.fees_id),
    items: orders,
    raw: root,
  };
}

export function mapRenewalOptionsFromOverview(overviewPayload) {
  const overview = mapOverviewResponse(overviewPayload);
  return {
    eligible: true,
    daysLeft: null,
    currentEnd: cleanString(overview.subscription.endDate),
    courses: toArray(overview.subscription.availableCourses).map((course) => {
      const row = toObject(course);
      const id = toNumber(row.id);
      return {
        id,
        value: cleanString(id || row.value),
        label: cleanString(row.name || row.course_name || row.label || `#${id || ''}`),
        course_name: cleanString(row.name || row.course_name),
        start_date: cleanString(row.startDate || row.start_date),
        end_date: cleanString(row.endDate || row.end_date),
        num_of_sessions: toNumber(row.numberOfSessions || row.num_of_sessions),
        raw: row,
      };
    }),
    groups: toArray(overview.subscription.availableGroups).map((group) => {
      const row = toObject(group);
      const id = toNumber(row.id);
      return {
        id,
        value: cleanString(id || row.value),
        label: cleanString(row.name || row.group_name || row.label || `#${id || ''}`),
        course_id: toNumber(row.courseId || row.course_id || row.course?.id),
        schedule: toArray(row.schedule),
        raw: row,
      };
    }),
    levels: toArray(overview.levels).map((level, index) => {
      const row = toObject(level);
      const key = cleanString(row.key || row.value || row.id || index + 1);
      return {
        key,
        value: key,
        label_en: cleanString(row.label_en || row.labelEn || row.label || key),
        label_ar: cleanString(row.label_ar || row.labelAr || row.label || key),
        raw: row,
      };
    }),
    currentRegistration: {
      id: toNumber(overview.subscription.id || overview.subscription.currentRegId),
      registration_type: cleanString(overview.subscription.registrationType),
      start_date: cleanString(overview.subscription.startDate),
      end_date: cleanString(overview.subscription.endDate),
      number_of_sessions: toNumber(overview.subscription.numberOfSessions),
      group_id: toNumber(overview.subscription.groupId),
      group_name: cleanString(overview.subscription.groupName),
      course_id: toNumber(overview.subscription.courseId),
      course_name: cleanString(overview.subscription.courseName),
      level: cleanString(overview.subscription.level),
    },
    raw: toObject(overview.raw),
  };
}

export function mapRenewalEligibilityResponse(payload) {
  const root = toObject(payload);
  return {
    eligible: Boolean(root.eligible),
    daysLeft: toNumber(root.days_left || root.daysLeft),
    endDate: cleanString(root.end_date || root.endDate),
    hasPendingRequest: Boolean(root.has_pending_request || root.hasPendingRequest),
    raw: root,
  };
}

const normalizeRenewalCourseOption = (course) => {
  const row = toObject(course);
  const id = toNumber(row.id || row.course_id);
  return {
    id,
    value: cleanString(row.value || id),
    label: cleanString(row.label || row.course_name || row.name || `#${id || ''}`),
    course_name: cleanString(row.course_name || row.name || row.label),
    start_date: cleanString(row.start_date || row.startDate),
    end_date: cleanString(row.end_date || row.endDate),
    num_of_sessions: toNumber(row.num_of_sessions || row.number_of_sessions),
    raw: row,
  };
};

const normalizeRenewalGroupOption = (group) => {
  const row = toObject(group);
  const id = toNumber(row.id || row.group_id);
  return {
    id,
    value: cleanString(row.value || id),
    label: cleanString(row.label || row.name || row.group_name || `#${id || ''}`),
    course_id: toNumber(row.course_id || row.courseId || row.course?.id),
    schedule: toArray(row.schedule || row.training_days || row.group_schedule),
    raw: row,
  };
};

const normalizeRenewalLevelOption = (level, index) => {
  const row = toObject(level);
  const key = cleanString(row.key || row.value || row.id || index + 1);
  return {
    key,
    value: key,
    label_en: cleanString(row.label_en || row.labelEn || row.label || key),
    label_ar: cleanString(row.label_ar || row.labelAr || row.label || key),
    raw: row,
  };
};

export function mapRenewalOptionsResponse(payload) {
  const root = toObject(payload);
  const data = toObject(root.data);

  const levels = toArray(root.levels || data.levels).map(normalizeRenewalLevelOption);
  const currentRegistration = toObject(root.current_registration || root.currentReg || data.current_registration);

  return {
    eligible: Boolean(root.eligible ?? data.eligible),
    daysLeft: toNumber(root.days_left || root.daysLeft || data.days_left || data.daysLeft),
    currentEnd: cleanString(root.current_end || root.currentEnd || data.current_end || data.currentEnd),
    courses: toArray(root.courses || data.courses).map(normalizeRenewalCourseOption),
    groups: toArray(root.groups || data.groups).map(normalizeRenewalGroupOption),
    levels,
    currentRegistration: {
      id: toNumber(currentRegistration.id),
      registration_type: cleanString(currentRegistration.registration_type),
      start_date: cleanString(currentRegistration.start_date),
      end_date: cleanString(currentRegistration.end_date),
      number_of_sessions: toNumber(currentRegistration.number_of_sessions),
      group_id: toNumber(currentRegistration.group_id),
      group_name: cleanString(currentRegistration.group_name),
      course_id: toNumber(currentRegistration.course_id),
      course_name: cleanString(currentRegistration.course_name),
      level: cleanString(currentRegistration.level),
    },
    raw: root,
  };
}

export function mapFreezeListResponse(payload) {
  const root = toObject(payload);
  const data = toObject(root.data);
  const rows = toArray(root.rows || data.rows || data.items || root.items);
  const mapped = mapFreezeRows(rows);
  return {
    ...mapped,
    raw: root,
  };
}

export function mapFreezeCancelResponse(payload) {
  const root = toObject(payload);
  return {
    success: !cleanString(root.error),
    message: cleanString(root.message || root.detail || (cleanString(root.error) ? '' : 'Freeze request cancelled.')),
    error: cleanString(root.error),
    raw: root,
  };
}
