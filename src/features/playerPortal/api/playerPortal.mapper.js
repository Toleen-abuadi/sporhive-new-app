import { normalizeOverviewData, normalizeProxyCollection, toArray, toNumber, toObject } from '../utils/playerPortal.normalizers';
import { mapFreezeRows } from '../utils/playerPortal.freeze';
import {
  compareUniformStatusProgress,
  getUniformStatusStepIndex,
  normalizeUniformStatus,
  STATUS_ORDER,
} from '../utils/playerPortal.uniform';

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

const resolveGroupCourseId = (group) => {
  const row = toObject(group);
  const rawCourseId = row.course_id ?? row.courseId ?? row.course?.id ?? row.raw?.course_id ?? row.raw?.courseId ?? row.raw?.course?.id;
  const parsed = toNumber(rawCourseId);
  return parsed == null ? null : parsed;
};

const normalizeAvailableGroupForRenewal = (group) => {
  const row = toObject(group);
  const raw = toObject(row.raw);
  const id = toNumber(row.id ?? row.group_id ?? row.value ?? raw.id ?? raw.group_id);
  const courseId = resolveGroupCourseId(row);
  const name = cleanString(
    row.name ||
      row.group_name ||
      row.label ||
      raw.name ||
      raw.group_name ||
      raw.label
  );

  return {
    id,
    courseId,
    name,
    schedule: toArray(row.schedule || row.group_schedule || row.training_days || raw.schedule || raw.group_schedule || raw.training_days),
    raw: Object.keys(raw).length > 0 ? raw : row,
  };
};

const dedupeAvailableGroups = (groups = []) => {
  const seen = new Set();
  return groups.filter((group) => {
    const id = toNumber(group?.id);
    const courseId = group?.courseId == null ? null : toNumber(group.courseId);
    const name = cleanString(group?.name).toLowerCase();
    const key = id != null ? `id:${id}` : `name:${name}|course:${courseId == null ? 'null' : courseId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const collectAvailableGroupsForRenewal = (normalized) => {
  const root = toObject(normalized?.raw);
  const rootData = toObject(root.data);
  const rootPlayerData = toObject(root.player_data);
  const dataPlayerData = toObject(rootData.player_data);
  const playerData = toObject(normalized?.playerDataRaw);

  const merged = [
    ...toArray(normalized?.registrationInfo?.availableGroups),
    ...toArray(playerData.available_groups),
    ...toArray(rootPlayerData.available_groups),
    ...toArray(dataPlayerData.available_groups),
    ...toArray(root.available_groups),
    ...toArray(rootData.available_groups),
  ]
    .map(normalizeAvailableGroupForRenewal)
    .filter((group) => group.id != null || group.name);

  return dedupeAvailableGroups(merged);
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
      availableGroups: collectAvailableGroupsForRenewal(normalized),
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
  const playerData = toObject(source.raw?.player_data);
  const playerInfo = toObject(playerData.player_info);
  const registrationInfo = toObject(playerData.registration_info);

  return {
    id: toNumber(player.id),
    first_eng_name: cleanString(playerInfo.first_eng_name),
    middle_eng_name: cleanString(playerInfo.middle_eng_name),
    last_eng_name: cleanString(playerInfo.last_eng_name),
    first_ar_name: cleanString(playerInfo.first_ar_name),
    middle_ar_name: cleanString(playerInfo.middle_ar_name),
    last_ar_name: cleanString(playerInfo.last_ar_name),
    phone1: cleanString(playerInfo.phone_numbers?.['1'] || player.phone),
    phone2: cleanString(playerInfo.phone_numbers?.['2']),
    date_of_birth: cleanString(player.dateOfBirth),
    address: cleanString(registrationInfo.address || playerInfo.address),
    google_maps_location: cleanString(
      registrationInfo.google_maps_location ||
      registrationInfo.google_map_location ||
      playerInfo.google_maps_location ||
      playerInfo.google_map_location
    ),
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
    google_maps_location: cleanString(
      profile.google_maps_location ||
      profile.google_map_location ||
      profile.google_maps_url ||
      profile.location
    ),
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
    currency: cleanString(row.currency || 'JOD'),
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

const statusRank = (status) => getUniformStatusStepIndex(status);

const mapUniformOrderRow = (order) => {
  const row = toObject(order);
  const product = toObject(row.product);

  const productNameEn = cleanString(
    row.uniform_en ||
      row.uniform_type_en ||
      row.product_name_en ||
      product.name_en ||
      product.name ||
      row.uniform_type ||
      row.product_name ||
      row.name
  );
  const productNameAr = cleanString(
    row.uniform_ar ||
      row.uniform_type_ar ||
      row.product_name_ar ||
      product.name_ar ||
      product.label_ar
  );

  return {
    id: toNumber(row.id),
    productId: toNumber(row.product_id || row.product?.id),
    variantId: toNumber(row.variant_id || row.variant?.id),
    productNameEn,
    productNameAr,
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
    status: normalizeUniformStatus(row.status),
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
      highestStatusRank: statusRank(item.status),
      latestStatus: normalizeUniformStatus(item.status),
      latestUpdatedAt: '',
      createdAt: item.createdAt || '',
    };
    current.items.push(item);
    const rank = statusRank(item.status);
    if (
      rank > current.highestStatusRank ||
      (rank === current.highestStatusRank &&
        new Date(item.updatedAt || item.createdAt || 0).getTime() >=
          new Date(current.latestUpdatedAt || current.createdAt || 0).getTime())
    ) {
      current.highestStatusRank = rank;
      current.latestStatus = normalizeUniformStatus(item.status);
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
      status:
        cleanString(group.latestStatus) ||
        STATUS_ORDER[group.highestStatusRank] ||
        'pending_payment',
      totalQuantity: group.items.reduce((sum, item) => sum + (toNumber(item.quantity) || 0), 0),
      itemCount: group.items.length,
    }))
    .sort((left, right) => {
      const statusSort = compareUniformStatusProgress(right.status, left.status);
      if (statusSort !== 0) return statusSort;
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
  const rawOverview = toObject(overview.raw);
  const rawData = toObject(rawOverview.data);
  return {
    eligible: true,
    daysLeft: null,
    currentEnd: cleanString(overview.subscription.endDate),
    hasPendingRequest: Boolean(
      rawOverview.has_pending_request ||
      rawOverview.hasPendingRequest ||
      rawData.has_pending_request ||
      rawData.hasPendingRequest
    ),
    isBlocked: false,
    blockingReason: '',
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
  const data = toObject(root.data);
  const hasPendingRequest = Boolean(
    root.has_pending_request ||
    root.hasPendingRequest ||
    data.has_pending_request ||
    data.hasPendingRequest
  );
  const blockingReason = cleanString(
    root.blocking_reason ||
    root.block_reason ||
    root.reason ||
    data.blocking_reason ||
    data.block_reason ||
    data.reason
  );
  const isBlocked =
    Boolean(root.is_blocked || root.isBlocked || data.is_blocked || data.isBlocked) ||
    cleanString(root.block_code || root.blockCode || data.block_code || data.blockCode).length > 0;

  return {
    eligible: Boolean(root.eligible ?? data.eligible),
    daysLeft: toNumber(root.days_left || root.daysLeft || data.days_left || data.daysLeft),
    endDate: cleanString(root.end_date || root.endDate || data.end_date || data.endDate),
    hasPendingRequest,
    isBlocked,
    blockingReason,
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
    hasPendingRequest: Boolean(
      root.has_pending_request ||
      root.hasPendingRequest ||
      data.has_pending_request ||
      data.hasPendingRequest
    ),
    isBlocked: Boolean(root.is_blocked || root.isBlocked || data.is_blocked || data.isBlocked),
    blockingReason: cleanString(
      root.blocking_reason ||
      root.block_reason ||
      root.reason ||
      data.blocking_reason ||
      data.block_reason ||
      data.reason
    ),
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

const extractFreezeRows = (payload) => {
  const root = toObject(payload);
  const data = toObject(root.data);

  const groupedRows = [
    ['pending', root.pending || data.pending],
    ['active', root.active || data.active || root.current || data.current],
    ['upcoming', root.upcoming || data.upcoming || root.scheduled || data.scheduled],
    ['ended', root.ended || data.ended || root.archived || data.archived],
    ['approved', root.approved || data.approved],
    ['rejected', root.rejected || data.rejected],
    ['cancelled', root.cancelled || data.cancelled || root.canceled || data.canceled],
  ].flatMap(([status, list]) =>
    toArray(list).map((row) => {
      const item = toObject(row);
      if (cleanString(item.status)) return item;
      return {
        ...item,
        status,
      };
    })
  );

  const directRows = [
    ...toArray(root.rows),
    ...toArray(data.rows),
    ...toArray(root.items),
    ...toArray(data.items),
    ...toArray(root.history),
    ...toArray(data.history),
    ...toArray(root.freezes),
    ...toArray(data.freezes),
  ];

  const merged = [...groupedRows, ...directRows];
  const seen = new Set();

  return merged.filter((row) => {
    const item = toObject(row);
    const identity =
      cleanString(item.id) ||
      [
        cleanString(item.startDate || item.start_date),
        cleanString(item.endDate || item.end_date),
        cleanString(item.status),
        cleanString(item.createdAt || item.created_at),
      ]
        .filter(Boolean)
        .join('|');

    const key = identity || JSON.stringify(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function mapFreezeListResponse(payload) {
  const root = toObject(payload);
  const rows = extractFreezeRows(payload);
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
