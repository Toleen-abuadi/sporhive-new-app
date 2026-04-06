import {
  cleanString,
  pickFirst,
  toArray,
  toBoolean,
  toIsoDate,
  toNumber,
  toObject,
  toTimeHHMM,
} from '../utils/playgrounds.normalizers';
import {
  normalizeBookingStatus,
  PLAYGROUNDS_PAYMENT_TYPES,
  resolvePaymentType,
} from '../utils/playgrounds.statuses';

const toStringId = (value) => {
  const normalized = cleanString(value);
  return normalized || '';
};

const normalizePrice = (value) => {
  const numeric = toNumber(value);
  if (numeric == null) return null;
  return numeric;
};

export const mapVenueImageUrl = (image, { getVenueImageUrl } = {}) => {
  const item = toObject(image);
  const direct = cleanString(item.url || item.image || item.src || image);

  if (!direct) return '';
  if (direct.startsWith('http') || direct.startsWith('data:image')) return direct;

  const id = cleanString(item.id || item.image_id || item.imageId || direct);
  if (typeof getVenueImageUrl === 'function' && id) {
    return getVenueImageUrl(id);
  }

  return direct;
};

export function mapAcademyProfileMarketplace(profile) {
  const item = toObject(profile);
  const marketplace = toObject(item.marketplace);

  return {
    id: toStringId(item.id),
    academyId: toStringId(item.academy_id || item.academyId),
    publicName: cleanString(item.public_name || item.publicName),
    locationText: cleanString(item.location_text || item.locationText),
    mapsUrl: cleanString(item.maps_url || item.mapsUrl),
    tags: toArray(item.tags).filter(Boolean),
    paymentConfig: {
      allowCash: item.allow_cash == null ? true : toBoolean(item.allow_cash),
      allowCashOnDate: toBoolean(item.allow_cash_on_date),
      allowCliq: toBoolean(item.allow_cliq),
      cliqName: cleanString(item.cliq_name),
      cliqNumber: cleanString(item.cliq_number),
      cashExtraType: cleanString(item.cash_on_date_extra_type),
      cashExtraValue: toNumber(item.cash_on_date_extra_value) || 0,
    },
    marketplace: {
      tier: cleanString(
        pickFirst(
          marketplace.tier,
          item.marketplace_tier,
          item.tier
        )
      ).toLowerCase(),
      tierRank: toNumber(pickFirst(marketplace.tier_rank, item.marketplace_tier_rank)) || 0,
      badges: toArray(pickFirst(marketplace.badges, item.marketplace_badges)).filter(Boolean),
      isFeatured: toBoolean(pickFirst(marketplace.is_featured, item.is_featured)),
      isPro: toBoolean(pickFirst(marketplace.is_pro, item.is_pro)),
      premiumLevel: cleanString(pickFirst(marketplace.premium_level, item.premium_level)),
      priorityScore: toNumber(pickFirst(marketplace.priority_score, item.priority_score)) || 0,
    },
    heroImage: cleanString(item.hero_image || item.heroImage),
    raw: item,
  };
}

const mapVenueImages = (images, options) =>
  toArray(images)
    .map((image) => {
      const item = toObject(image);
      const url = mapVenueImageUrl(item, options);
      if (!url) return null;

      return {
        id: toStringId(item.id || item.image_id),
        order: toNumber(item.order) || 0,
        filename: cleanString(item.filename),
        contentType: cleanString(item.content_type || item.contentType),
        url,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.order - right.order);

export function mapVenueRow(venue, options = {}) {
  const item = toObject(venue);
  const academyProfile = mapAcademyProfileMarketplace(item.academy_profile);
  const images = mapVenueImages(item.images, options);
  const image =
    cleanString(item.image) ||
    cleanString(item.main_image) ||
    cleanString(images[0]?.url) ||
    '';

  return {
    id: toStringId(item.id),
    academyProfileId: toStringId(item.academy_profile_id || item.academy_id),
    activityId: toStringId(item.activity_id),
    name: cleanString(item.name),
    pitchSize: cleanString(item.pitch_size),
    areaSize: cleanString(item.area_size),
    location: cleanString(item.base_location),
    lat: toNumber(item.lat || item.latitude),
    lng: toNumber(item.lng || item.longitude),
    minPlayers: toNumber(item.min_players),
    maxPlayers: toNumber(item.max_players),
    hasSpecialOffer: toBoolean(item.has_special_offer),
    specialOfferNote: cleanString(item.special_offer_note),
    avgRating: toNumber(item.avg_rating) || 0,
    ratingsCount: toNumber(item.ratings_count) || 0,
    price: normalizePrice(item.price),
    distanceKm: toNumber(item.distance_km),
    image,
    images,
    academyProfile,
    marketplace: academyProfile.marketplace,
    raw: item,
  };
}

export function mapVenueCard(venue, options = {}) {
  const mapped = mapVenueRow(venue, options);
  return {
    id: mapped.id,
    name: mapped.name,
    image: mapped.image,
    location: mapped.location || mapped.academyProfile.locationText,
    academyName: mapped.academyProfile.publicName,
    avgRating: mapped.avgRating,
    ratingsCount: mapped.ratingsCount,
    minPlayers: mapped.minPlayers,
    maxPlayers: mapped.maxPlayers,
    hasSpecialOffer: mapped.hasSpecialOffer,
    specialOfferNote: mapped.specialOfferNote,
    price: mapped.price,
    distanceKm: mapped.distanceKm,
    marketplace: mapped.marketplace,
    paymentConfig: mapped.academyProfile.paymentConfig,
    raw: mapped.raw,
  };
}

export function mapSlotRow(slot) {
  const item = toObject(slot);
  const startTime = toTimeHHMM(item.start_time || item.startTime);
  const endTime = toTimeHHMM(item.end_time || item.endTime);

  return {
    id: `${startTime}-${endTime}`,
    startTime,
    endTime,
    raw: item,
  };
}

export function mapDurationRow(duration) {
  const item = toObject(duration);

  return {
    id: toStringId(item.id),
    venueId: toStringId(item.venue || item.venue_id),
    minutes: toNumber(item.minutes),
    basePrice: normalizePrice(item.base_price || item.price),
    isDefault: toBoolean(item.is_default),
    isActive: item.is_active == null ? true : toBoolean(item.is_active),
    note: cleanString(item.note),
    raw: item,
  };
}

const toDateTime = (dateValue, timeValue) => {
  const date = toIsoDate(dateValue);
  const time = toTimeHHMM(timeValue);
  if (!date || !time) return null;

  const parsed = new Date(`${date}T${time}:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const canModifyBy24hWindow = (dateValue, timeValue) => {
  const bookingStart = toDateTime(dateValue, timeValue);
  if (!bookingStart) return true;

  const now = new Date();
  const minAllowed = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return bookingStart.getTime() > minAllowed.getTime();
};

export function mapBookingRow(booking, { locale = 'en' } = {}) {
  const item = toObject(booking);
  const venue = toObject(item.venue);
  const duration = toObject(item.duration);
  const activity = toObject(item.activity);
  const payment = toObject(item.payment);
  const academy = toObject(item.academy || item.academy_profile);

  const paymentType = cleanString(
    pickFirst(payment.payment_type, payment.type, item.payment_type)
  ).toLowerCase();
  const status = normalizeBookingStatus(item.status);

  const date = toIsoDate(item.date || item.booking_date);
  const startTime = toTimeHHMM(item.start_time || item.startTime);
  const endTime = toTimeHHMM(item.end_time || item.endTime);
  const canModifyStatus = status === 'pending' || status === 'approved';
  const canModifyWindow = canModifyBy24hWindow(date, startTime);
  const canModify = canModifyStatus && canModifyWindow;

  let modifyRestrictionReason = '';
  if (!canModifyStatus) {
    modifyRestrictionReason = 'status_restricted';
  } else if (!canModifyWindow) {
    modifyRestrictionReason = 'less_than_24h';
  }

  return {
    id: toStringId(item.id),
    bookingCode: cleanString(item.booking_code || item.code),
    status,
    source: cleanString(item.source),
    date,
    startTime,
    endTime,
    numberOfPlayers: toNumber(item.number_of_players) || 0,
    venueId: toStringId(venue.id || item.venue_id),
    venueName: cleanString(venue.name || item.venue_name),
    venueImage: cleanString(venue.image || venue.main_image),
    venueLocation: cleanString(venue.base_location || venue.location || item.venue_location),
    academyName: cleanString(academy.public_name || academy.name),
    academyPhone: cleanString(
      pickFirst(
        academy.phone_number,
        academy.phone,
        item.academy_phone,
        item.phone_number
      )
    ),
    activityId: toStringId(activity.id || item.activity_id),
    activityName: cleanString(activity.name || item.activity_name),
    durationId: toStringId(duration.id || item.duration_id),
    durationMinutes: toNumber(duration.minutes || item.duration_minutes),
    payment: {
      id: toStringId(payment.id),
      type: paymentType || PLAYGROUNDS_PAYMENT_TYPES.CASH,
      typeLabel: resolvePaymentType(paymentType || PLAYGROUNDS_PAYMENT_TYPES.CASH, locale),
      status: cleanString(payment.status || 'pending').toLowerCase(),
      amount: normalizePrice(payment.amount || item.total_price),
      currency: cleanString(payment.currency || 'JOD'),
      cashOnDate: toBoolean(payment.cash_on_date || item.cash_payment_on_date),
      cliqImages: toArray(payment.cliq_images),
    },
    canCancel: canModify,
    canUpdate: canModify,
    canModifyByStatus: canModifyStatus,
    canModifyByWindow: canModifyWindow,
    modifyRestrictionReason,
    raw: item,
  };
}

export function mapBookingCard(booking, options = {}) {
  const mapped = mapBookingRow(booking, options);

  return {
    id: mapped.id,
    bookingCode: mapped.bookingCode,
    status: mapped.status,
    date: mapped.date,
    startTime: mapped.startTime,
    endTime: mapped.endTime,
    venueName: mapped.venueName,
    activityName: mapped.activityName,
    numberOfPlayers: mapped.numberOfPlayers,
    durationMinutes: mapped.durationMinutes,
    paymentAmount: mapped.payment.amount,
    paymentType: mapped.payment.type,
    canCancel: mapped.canCancel,
    canUpdate: mapped.canUpdate,
    raw: mapped.raw,
  };
}

export function mapActivitiesResponse(payload) {
  const root = toObject(payload);

  const items = toArray(root.activities).map((row) => {
    const item = toObject(row);
    const nameEn = cleanString(item.name_en || item.name || item.title);
    const nameAr = cleanString(item.name_ar);

    return {
      id: toStringId(item.id),
      key: cleanString(item.key || item.slug || nameEn.toLowerCase().replace(/\s+/g, '-')),
      nameEn,
      nameAr,
      name: nameEn,
      description: cleanString(item.description),
      raw: item,
    };
  });

  return {
    items,
    raw: root,
  };
}

export function mapVenuesResponse(payload, options = {}) {
  const root = toObject(payload);
  const items = toArray(root.venues).map((row) => mapVenueRow(row, options));

  return {
    items,
    total: items.length,
    raw: root,
  };
}

export function mapSlotsResponse(payload) {
  const root = toObject(payload);
  const items = toArray(root.slots).map(mapSlotRow).filter((slot) => slot.startTime && slot.endTime);

  return {
    items,
    total: items.length,
    raw: root,
  };
}

export function mapDurationsResponse(payload) {
  const root = toObject(payload);
  const items = toArray(root.durations)
    .map(mapDurationRow)
    .filter((row) => row.id && row.isActive);

  return {
    items,
    total: items.length,
    raw: root,
  };
}

export function mapBookingsResponse(payload, options = {}) {
  const root = toObject(payload);
  const items = toArray(root.bookings).map((row) => mapBookingRow(row, options));

  return {
    items,
    total: items.length,
    raw: root,
  };
}

export function mapCreateBookingResponse(payload) {
  const root = toObject(payload);
  const payment = toObject(root.payment);

  return {
    bookingId: toStringId(root.booking_id),
    bookingCode: cleanString(root.booking_code),
    totalPrice: normalizePrice(root.total_price),
    payment: {
      id: toStringId(payment.id),
      type: cleanString(payment.payment_type || payment.type),
      status: cleanString(payment.status),
      amount: normalizePrice(payment.amount),
      currency: cleanString(payment.currency || 'JOD'),
      raw: payment,
    },
    raw: root,
  };
}

export function mapCanRateResponse(payload) {
  const root = toObject(payload);

  return {
    canRate: toBoolean(root.can_rate),
    reason: cleanString(root.reason),
    raw: root,
  };
}

export function mapResolveRatingTokenResponse(payload) {
  const root = toObject(payload);

  return {
    bookingId: toStringId(root.booking_id),
    userId: toStringId(root.user_id),
    raw: root,
  };
}
