import {
  getLocalizedText,
} from '../utils/academyDiscovery.formatters';
import {
  buildAcademyMapHref,
  mapAcademyToMarker,
} from '../utils/academyDiscovery.maps';
import {
  normalizeJoinStatus,
} from '../utils/academyDiscovery.statuses';
import {
  cleanString,
  pickFirst,
  toArray,
  toBoolean,
  toNumber,
  toObject,
} from '../utils/academyDiscovery.normalizers';

const toStringId = (value) => {
  const normalized = cleanString(value);
  return normalized || '';
};

const resolveApiOrigin = (apiBaseUrl = '') => {
  const raw = cleanString(apiBaseUrl);
  if (!raw) return '';

  try {
    return new URL(raw).origin;
  } catch {
    const withoutVersion = raw.replace(/\/api\/v1$/i, '');
    if (withoutVersion.startsWith('http')) return withoutVersion;
    return '';
  }
};

const joinUrl = (base, path) => {
  const safeBase = cleanString(base).replace(/\/+$/, '');
  const safePath = cleanString(path);
  if (!safeBase || !safePath) return '';
  return `${safeBase}${safePath.startsWith('/') ? safePath : `/${safePath}`}`;
};

const toDataUrl = ({ base64, mime }) => {
  const encoded = cleanString(base64);
  if (!encoded) return '';
  const contentType = cleanString(mime) || 'image/jpeg';
  return `data:${contentType};base64,${encoded}`;
};

const isLikelyBase64Image = (value) => {
  const raw = cleanString(value);
  if (!raw || raw.length < 80) return false;
  return /^[A-Za-z0-9+/=\r\n]+$/.test(raw);
};

const resolveImageUrl = ({ slug, kind, direct, hasImage }, options = {}) => {
  const raw = cleanString(direct);
  const apiBaseUrl = cleanString(options.apiBaseUrl);
  const apiOrigin = cleanString(options.apiOrigin || resolveApiOrigin(apiBaseUrl));

  if (raw.startsWith('http') || raw.startsWith('data:')) {
    return raw;
  }

  if (isLikelyBase64Image(raw)) {
    return toDataUrl({ base64: raw });
  }

  if (raw.startsWith('/api/')) {
    return joinUrl(apiOrigin, raw) || raw;
  }

  if (raw.startsWith('/public/')) {
    if (apiBaseUrl) return joinUrl(apiBaseUrl, raw);
    return joinUrl(`${apiOrigin}/api/v1`, raw) || raw;
  }

  if (raw.startsWith('/')) {
    return joinUrl(apiOrigin || apiBaseUrl, raw) || raw;
  }

  if (raw) {
    return joinUrl(apiOrigin || apiBaseUrl, raw) || raw;
  }

  if (hasImage && slug && typeof options.getAcademyImageUrl === 'function') {
    return options.getAcademyImageUrl(slug, kind);
  }

  return '';
};

export function mapAcademyDiscoveryRow(row, options = {}) {
  const item = toObject(row);
  const slug = cleanString(item.slug);
  const logoMeta = toObject(item.logo_meta || item.logoMeta);
  const coverMeta = toObject(item.cover_meta || item.coverMeta);
  const rawLogo = pickFirst(
    item.logo_url,
    item.logo,
    item.logo_image,
    item.logoUrl,
    item.avatar,
    item.avatar_url,
    item.image_logo
  );
  const rawCover = pickFirst(
    item.cover_url,
    item.cover_image,
    item.cover,
    item.coverUrl,
    item.hero_image,
    item.heroImage,
    item.banner,
    item.banner_url,
    item.image,
    item.main_image
  );

  const academy = {
    id: toStringId(item.id),
    slug,
    nameEn: cleanString(item.name_en || item.nameEn || item.name),
    nameAr: cleanString(item.name_ar || item.nameAr),
    shortDescEn: cleanString(item.short_desc_en || item.shortDescEn),
    shortDescAr: cleanString(item.short_desc_ar || item.shortDescAr),
    sportTypes: toArray(item.sport_types).filter(Boolean),
    agesFrom: toNumber(item.ages_from || item.age_from || item.agesFrom),
    agesTo: toNumber(item.ages_to || item.age_to || item.agesTo),
    subscriptionFeeType: cleanString(
      item.subscription_fee_type || item.subscriptionFeeType
    ),
    subscriptionFeeAmount: toNumber(
      item.subscription_fee_amount || item.subscriptionFeeAmount
    ),
    registrationEnabled:
      item.registration_enabled == null
        ? toBoolean(item.list_your_academy)
        : toBoolean(item.registration_enabled),
    registrationOpen: toBoolean(item.registration_open),
    isSearchableOnMap:
      item.is_searchable_on_map == null ? true : toBoolean(item.is_searchable_on_map),
    hasFacilitiesBooking: toBoolean(
      item.has_facilities_booking || item.playgrounds_booking
    ),
    isPro: toBoolean(item.is_pro),
    isFeatured: toBoolean(item.is_featured),
    premiumLevel: cleanString(item.premium_level),
    priorityScore: toNumber(item.priority_score) || 0,
    city: cleanString(item.city),
    country: cleanString(item.country),
    address: cleanString(item.address),
    lat: toNumber(item.lat || item.latitude),
    lng: toNumber(item.lng || item.longitude),
    distanceKm: toNumber(item.distance_km || item.distanceKm),
    contactEmail: cleanString(item.contact_email),
    contactPhones: toArray(item.contact_phones || item.contact_phones_json).filter(Boolean),
    website: cleanString(item.website),
    mapsUrl: cleanString(
      pickFirst(item.maps_url, item.mapsUrl, item.google_maps_link, item.maps_link)
    ),
    logoMeta,
    coverMeta,
    logoUrl: resolveImageUrl(
      {
        slug,
        kind: 'logo',
        direct: rawLogo,
        hasImage: toBoolean(logoMeta.has),
      },
      options
    ),
    coverUrl: resolveImageUrl(
      {
        slug,
        kind: 'cover',
        direct: rawCover,
        hasImage: toBoolean(coverMeta.has),
      },
      options
    ),
    createdAt: cleanString(item.created_at || item.createdAt),
    updatedAt: cleanString(item.updated_at || item.updatedAt),
    raw: item,
  };

  academy.name = getLocalizedText({
    locale: options.locale,
    valueEn: academy.nameEn,
    valueAr: academy.nameAr,
    fallback: cleanString(item.name),
  });
  academy.description = getLocalizedText({
    locale: options.locale,
    valueEn: academy.shortDescEn,
    valueAr: academy.shortDescAr,
  });
  academy.mapHref = buildAcademyMapHref(academy);

  return academy;
}

export function mapAcademyCardPayload(row, options = {}) {
  const academy = mapAcademyDiscoveryRow(row, options);

  return {
    id: academy.id,
    slug: academy.slug,
    name: academy.name,
    nameEn: academy.nameEn,
    nameAr: academy.nameAr,
    description: academy.description,
    sportTypes: academy.sportTypes,
    agesFrom: academy.agesFrom,
    agesTo: academy.agesTo,
    city: academy.city,
    country: academy.country,
    address: academy.address,
    lat: academy.lat,
    lng: academy.lng,
    mapsUrl: academy.mapsUrl,
    distanceKm: academy.distanceKm,
    subscriptionFeeAmount: academy.subscriptionFeeAmount,
    subscriptionFeeType: academy.subscriptionFeeType,
    rating: academy.raw?.rating ?? academy.raw?.avg_rating ?? academy.raw?.average_rating ?? null,
    ratingsCount:
      academy.raw?.ratings_count ??
      academy.raw?.rating_count ??
      academy.raw?.reviews_count ??
      null,
    isPro: academy.isPro,
    isFeatured: academy.isFeatured,
    registrationEnabled: academy.registrationEnabled,
    registrationOpen: academy.registrationOpen,
    premiumLevel: academy.premiumLevel,
    priorityScore: academy.priorityScore,
    coverUrl: academy.coverUrl,
    logoUrl: academy.logoUrl,
    mapHref: academy.mapHref,
    createdAt: academy.createdAt,
    raw: academy.raw,
  };
}

const mapAcademyCollection = (payload, options = {}) => {
  const root = toObject(payload);
  const source = Array.isArray(root.data)
    ? root.data
    : toArray(root.items || root.academies || root.results || payload);

  const items = source.map((row) => mapAcademyCardPayload(row, options));
  const total = toNumber(root.total || root.count) || items.length;

  return {
    items,
    total,
    message: cleanString(root.message),
    raw: root,
  };
};

export function mapAcademiesListResponse(payload, options = {}) {
  return mapAcademyCollection(payload, options);
}

export function mapAcademiesMapResponse(payload, options = {}) {
  const mapped = mapAcademyCollection(payload, options);
  const markers = mapped.items
    .map((academy) => mapAcademyToMarker(academy))
    .filter(Boolean);

  return {
    ...mapped,
    markers,
  };
}

const mapTemplateCoach = (coach) => {
  if (typeof coach === 'string') {
    const label = cleanString(coach);
    return label
      ? {
          name: label,
          certification: '',
          experienceYears: null,
          label,
          raw: coach,
        }
      : null;
  }

  const item = toObject(coach);
  const name = cleanString(
    item.name ||
      item.Name ||
      item.coach_name ||
      item.coachName
  );
  const certification = cleanString(
    item.certification ||
      item.Certification
  );
  const experienceYears = toNumber(
    item.experience_years ||
      item.Experience_years ||
      item.years_of_experience
  );

  const label =
    name ||
    certification ||
    (experienceYears != null ? `${experienceYears}` : '');

  if (!label) return null;

  return {
    name,
    certification,
    experienceYears,
    label,
    raw: item,
  };
};

const mapCourseSchedule = (row) => {
  const item = toObject(row);
  return {
    dayOfWeek: toNumber(item.day_of_week),
    startTime: cleanString(item.start_time),
    endTime: cleanString(item.end_time),
    raw: item,
  };
};

const mapTemplateCourse = (course) => {
  const item = toObject(course);
  const posterMeta = toObject(item.poster_meta || item.posterMeta);
  const posterBase64 = cleanString(item.poster_base64 || item.posterBase64);

  return {
    id: toStringId(item.id),
    nameEn: cleanString(item.name_en || item.nameEn),
    nameAr: cleanString(item.name_ar || item.nameAr),
    descriptionEn: cleanString(item.description_en || item.descriptionEn),
    descriptionAr: cleanString(item.description_ar || item.descriptionAr),
    sportCategory: cleanString(item.sport_category || item.sportCategory),
    level: cleanString(item.level),
    ageFrom: toNumber(item.age_from || item.ages_from),
    ageTo: toNumber(item.age_to || item.ages_to),
    coaches: toArray(item.coaches || item.coaches_json)
  .map(mapTemplateCoach)
  .filter(Boolean),
    schedules: toArray(item.schedules).map(mapCourseSchedule),
    posterMeta,
    posterUrl: toDataUrl({ base64: posterBase64, mime: posterMeta.mime }),
    raw: item,
  };
};

const mapTemplateMediaItem = (item) => {
  const row = toObject(item);
  const fileMeta = toObject(row.file_meta || row.fileMeta);
  const fileBase64 = cleanString(row.file_base64 || row.fileBase64);

  return {
    id: toStringId(row.id),
    type: cleanString(row.type),
    captionEn: cleanString(row.caption_en || row.captionEn),
    captionAr: cleanString(row.caption_ar || row.captionAr),
    sortOrder: toNumber(row.sort_order) || 0,
    fileMeta,
    source: toDataUrl({ base64: fileBase64, mime: fileMeta.mime }),
    raw: row,
  };
};

const mapSuccessStory = (story) => {
  const item = toObject(story);
  const mediaMeta = toObject(item.media_meta || item.mediaMeta);
  const mediaBase64 = cleanString(item.media_base64 || item.mediaBase64);

  return {
    titleEn: cleanString(item.title_en || item.titleEn),
    titleAr: cleanString(item.title_ar || item.titleAr),
    contentEn: cleanString(item.content_en || item.contentEn),
    contentAr: cleanString(item.content_ar || item.contentAr),
    mediaMeta,
    mediaSource: toDataUrl({ base64: mediaBase64, mime: mediaMeta.mime }),
    raw: item,
  };
};

export function mapAcademyTemplateResponse(payload, options = {}) {
  const root = toObject(payload);
  const data = toObject(root.data);
  const academy = mapAcademyDiscoveryRow(toObject(data.academy), options);
  const academyRaw = toObject(data.academy);

  const coverBase64 = cleanString(academyRaw.cover_base64 || academyRaw.coverBase64);
  const logoBase64 = cleanString(academyRaw.logo_base64 || academyRaw.logoBase64);
  const coverMeta = toObject(academyRaw.cover_meta || academyRaw.coverMeta);
  const logoMeta = toObject(academyRaw.logo_meta || academyRaw.logoMeta);

  const courses = toArray(data.courses).map(mapTemplateCourse);
  const mediaByTypeRaw = toObject(data.media_by_type || data.mediaByType);
  const mediaByType = {};

  Object.keys(mediaByTypeRaw).forEach((typeKey) => {
    mediaByType[typeKey] = toArray(mediaByTypeRaw[typeKey])
      .map(mapTemplateMediaItem)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  });

  const galleryTypes = ['ad', 'team', 'poster', 'championship', 'certificate', 'other'];
  const gallery = galleryTypes.flatMap((typeKey) => mediaByType[typeKey] || []);
  const successStory = data.success_story ? mapSuccessStory(data.success_story) : null;

  return {
    academy: {
      ...academy,
      coverSource: toDataUrl({ base64: coverBase64, mime: coverMeta.mime }) || academy.coverUrl,
      logoSource: toDataUrl({ base64: logoBase64, mime: logoMeta.mime }) || academy.logoUrl,
    },
    sections: toObject(data.template_sections),
    courses,
    mediaByType,
    gallery,
    successStory,
    raw: root,
  };
}

export function mapJoinRequestResponse(payload) {
  const root = toObject(payload);
  const data = toObject(root.data);
  const normalizedStatus = normalizeJoinStatus(data.status);

  return {
    id: toStringId(data.id),
    remoteTryoutId: toStringId(data.remote_tryout_id),
    status: normalizedStatus,
    forwarded:
      data.forwarded == null ? normalizedStatus === 'forwarded' : toBoolean(data.forwarded),
    message: cleanString(root.message),
    raw: root,
  };
}
