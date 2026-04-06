const EN = {
  discovery: {
    title: 'Academies',
    subtitle: 'Discover academies and join in a few taps',
    filtersTitle: 'Smart filters',
    filtersHint: 'Adjust discovery by sport, city, and tier',
    results: '{{count}} academies',
    mapTitle: 'Map-ready academies',
    mapHint: '{{count}} academies include map coordinates',
    mapUnavailable: 'Map data is currently unavailable.',
    mapEmpty: 'No mappable academies for the selected filters.',
    mapMarkersHint: 'Tap any marker to open academy details.',
    pinnedHint: 'Pinned academy',
  },
  filters: {
    search: 'Search',
    searchPlaceholder: 'Search by academy, city, or country',
    sport: 'Sport',
    city: 'City',
    cityPlaceholder: 'Type a city name',
    allSports: 'All sports',
    ageGroup: 'Age group',
    youth: 'Youth',
    adult: 'Adult',
    ageFrom: 'From',
    ageTo: 'To',
    registrationEnabled: 'Registration enabled',
    proOnly: 'PRO only',
    sort: 'Sort',
    sortRecommended: 'Recommended',
    sortNewest: 'Newest',
    sortNearest: 'Nearest',
  },
  card: {
    location: 'Location',
    price: 'Fee',
    rating: 'Rating',
    distance: 'Distance',
    noImage: 'No image',
    proLabel: 'PRO',
    featuredLabel: 'Featured',
    registrationClosed: 'Registration closed',
  },
  template: {
    aboutTitle: 'About',
    aboutEmpty: 'No academy description was provided.',
    statsTitle: 'Highlights',
    statsSubtitle: 'Quick academy snapshot',
    programsTitle: 'Programs',
    programsEmpty: 'No active courses were published yet.',
    galleryTitle: 'Gallery',
    galleryEmpty: 'No media items available.',
    successStoryTitle: 'Success Story',
    locationTitle: 'Location',
    locationHint: 'Tap the map card to open directions',
    contactTitle: 'Contact',
    enrollNow: 'Enroll now',
    contactAcademy: 'Contact academy',
    seasonalPrice: 'Seasonal fee',
    includesTitle: 'Includes',
    joinNotAvailable: 'Registration is currently closed.',
    noDescription: 'Description is unavailable.',
    noAddress: 'No address available.',
    noContact: 'No contact details available.',
  },
  join: {
    title: 'Join Academy',
    subtitle: 'Submit your details and the academy will contact you.',
    englishNames: 'English names',
    arabicNames: 'Arabic names',
    contactInfo: 'Contact information',
    typeLabel: 'Application type',
    typeTryout: 'Tryout',
    typeOld: 'Existing player',
    firstNameEn: 'First name (EN)',
    middleNameEn: 'Middle name (EN)',
    lastNameEn: 'Last name (EN)',
    firstNameAr: 'First name (AR)',
    middleNameAr: 'Middle name (AR)',
    lastNameAr: 'Last name (AR)',
    phone1: 'Primary phone',
    phone2: 'Secondary phone',
    dob: 'Date of birth',
    notes: 'Notes',
    notesPlaceholder: 'Optional notes',
    submit: 'Send request',
    submitting: 'Submitting...',
    fixErrors: 'Please fix the highlighted fields.',
    successTitle: 'Request sent',
    successSubtitle: 'Your request to {{academy}} was submitted successfully.',
    errors: {
      firstEngRequired: 'First English name is required.',
      lastEngRequired: 'Last English name is required.',
      firstArRequired: 'First Arabic name is required.',
      lastArRequired: 'Last Arabic name is required.',
      englishOnly: 'Use English letters only.',
      arabicOnly: 'Use Arabic letters only.',
      phone1Required: 'Primary phone is required.',
      phoneInvalid: 'Phone number format is invalid.',
      dobRequired: 'Date of birth is required.',
      dobAge: 'Minimum age is 3 years.',
      notesMax: 'Maximum 200 characters are allowed.',
    },
  },
  labels: {
    founded: 'Founded',
    players: 'Players',
    coaches: 'Coaches',
    languages: 'Languages',
    sports: 'Sports',
    ageRange: 'Age range',
    courses: 'Courses',
    schedules: 'Schedules',
    address: 'Address',
    phones: 'Phones',
    email: 'Email',
    website: 'Website',
    noData: 'N/A',
  },
  actions: {
    viewDetails: 'View details',
    joinNow: 'Join now',
    pin: 'Pin',
    pinned: 'Pinned',
    compare: 'Compare',
    retry: 'Retry',
    refresh: 'Refresh',
    clearFilters: 'Reset filters',
    showFilters: 'Show filters',
    hideFilters: 'Hide filters',
    listMode: 'List',
    mapMode: 'Map',
    loadMore: 'Load more',
    clearPin: 'Clear pin',
    openMap: 'Open maps',
    openAcademies: 'Discover academies',
    backToAcademies: 'Back to academies',
    done: 'Done',
    call: 'Call',
    email: 'Email',
    website: 'Open website',
    getDirections: 'Get directions',
  },
  empty: {
    title: 'No academies found',
    description: 'Try adjusting filters and search inputs.',
  },
  compare: {
    title: 'Compare Academies',
  },
  errors: {
    loadAcademies: 'Unable to load academies.',
    loadMapAcademies: 'Unable to load map academies.',
    loadTemplate: 'Unable to load academy details.',
    submitJoin: 'Unable to submit your join request.',
    mapUnsupported: 'Map preview is unavailable on this device.',
    network: 'Network issue. Please check your connection.',
    server: 'Server issue. Please try again shortly.',
    config: 'Academy discovery service is not configured.',
    notFound: 'Requested academy was not found.',
    invalidData: 'Some form fields are invalid.',
    generic: 'Something went wrong. Please try again.',
  },
};

const AR = {
  discovery: {
    title: 'الأكاديميات',
    subtitle: 'اكتشف الأكاديميات وقدّم طلب الانضمام بسهولة',
    filtersTitle: 'فلاتر ذكية',
    filtersHint: 'حدّد النتائج حسب الرياضة والمدينة والمستوى',
    results: '{{count}} أكاديمية',
    mapTitle: 'أكاديميات جاهزة للخريطة',
    mapHint: 'يوجد {{count}} أكاديمية مع إحداثيات',
    mapUnavailable: 'بيانات الخريطة غير متاحة حالياً.',
    mapEmpty: 'لا توجد أكاديميات قابلة للعرض على الخريطة حسب الفلاتر الحالية.',
    mapMarkersHint: 'اضغط على أي علامة لفتح تفاصيل الأكاديمية.',
    pinnedHint: 'الأكاديمية المثبّتة',
  },
  filters: {
    search: 'بحث',
    searchPlaceholder: 'ابحث باسم الأكاديمية أو المدينة أو الدولة',
    sport: 'الرياضة',
    city: 'المدينة',
    cityPlaceholder: 'اكتب اسم المدينة',
    allSports: 'كل الرياضات',
    ageGroup: 'الفئة العمرية',
    youth: 'ناشئين',
    adult: 'بالغين',
    ageFrom: 'من',
    ageTo: 'إلى',
    registrationEnabled: 'التسجيل متاح',
    proOnly: 'برو فقط',
    sort: 'الترتيب',
    sortRecommended: 'مقترح',
    sortNewest: 'الأحدث',
    sortNearest: 'الأقرب',
  },
  card: {
    location: 'الموقع',
    price: 'الرسوم',
    rating: 'التقييم',
    distance: 'المسافة',
    noImage: 'لا توجد صورة',
    proLabel: 'PRO',
    featuredLabel: 'مميز',
    registrationClosed: 'التسجيل مغلق',
  },
  template: {
    aboutTitle: 'عن الأكاديمية',
    aboutEmpty: 'لا يوجد وصف متاح للأكاديمية.',
    statsTitle: '\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A',
    statsSubtitle: '\u0644\u0645\u062D\u0629 \u0633\u0631\u064A\u0639\u0629 \u0639\u0646 \u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629',
    programsTitle: 'البرامج',
    programsEmpty: 'لا توجد دورات نشطة حالياً.',
    galleryTitle: 'المعرض',
    galleryEmpty: 'لا توجد وسائط متاحة.',
    successStoryTitle: 'قصة نجاح',
    locationTitle: 'الموقع',
    locationHint: '\u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u062E\u0631\u064A\u0637\u0629 \u0644\u0641\u062A\u062D \u0627\u0644\u0627\u062A\u062C\u0627\u0647\u0627\u062A',
    contactTitle: 'التواصل',
    enrollNow: 'سجّل الآن',
    contactAcademy: 'تواصل مع الأكاديمية',
    seasonalPrice: 'رسوم الموسم',
    includesTitle: 'يشمل',
    joinNotAvailable: 'التسجيل مغلق حالياً.',
    noDescription: 'الوصف غير متوفر.',
    noAddress: 'لا يوجد عنوان متاح.',
    noContact: 'لا توجد معلومات تواصل.',
  },
  join: {
    title: 'الانضمام للأكاديمية',
    subtitle: 'أدخل بياناتك وسيتم التواصل معك من الأكاديمية.',
    englishNames: 'الأسماء بالإنجليزية',
    arabicNames: 'الأسماء بالعربية',
    contactInfo: 'بيانات التواصل',
    typeLabel: 'نوع الطلب',
    typeTryout: 'تجريبي',
    typeOld: 'لاعب سابق',
    firstNameEn: 'الاسم الأول (EN)',
    middleNameEn: 'الاسم الأوسط (EN)',
    lastNameEn: 'اسم العائلة (EN)',
    firstNameAr: 'الاسم الأول (AR)',
    middleNameAr: 'اسم الأب (AR)',
    lastNameAr: 'اسم العائلة (AR)',
    phone1: 'الهاتف الأساسي',
    phone2: 'الهاتف الثانوي',
    dob: 'تاريخ الميلاد',
    notes: 'ملاحظات',
    notesPlaceholder: 'ملاحظات اختيارية',
    submit: 'إرسال الطلب',
    submitting: 'جاري الإرسال...',
    fixErrors: 'يرجى تصحيح الحقول المظللة.',
    successTitle: 'تم إرسال الطلب',
    successSubtitle: 'تم إرسال طلبك إلى {{academy}} بنجاح.',
    errors: {
      firstEngRequired: 'الاسم الأول بالإنجليزية مطلوب.',
      lastEngRequired: 'اسم العائلة بالإنجليزية مطلوب.',
      firstArRequired: 'الاسم الأول بالعربية مطلوب.',
      lastArRequired: 'اسم العائلة بالعربية مطلوب.',
      englishOnly: 'استخدم أحرف إنجليزية فقط.',
      arabicOnly: 'استخدم أحرف عربية فقط.',
      phone1Required: 'رقم الهاتف الأساسي مطلوب.',
      phoneInvalid: 'صيغة رقم الهاتف غير صحيحة.',
      dobRequired: 'تاريخ الميلاد مطلوب.',
      dobAge: 'الحد الأدنى للعمر 3 سنوات.',
    },
  },
  labels: {
    founded: '\u0627\u0644\u062A\u0623\u0633\u064A\u0633',
    players: '\u0644\u0627\u0639\u0628\u0648\u0646',
    coaches: '\u0645\u062F\u0631\u0628\u0648\u0646',
    languages: '\u0627\u0644\u0644\u063A\u0627\u062A',
    sports: 'الرياضات',
    ageRange: 'الفئة العمرية',
    courses: 'الدورات',
    schedules: 'المواعيد',
    address: 'العنوان',
    phones: 'الهواتف',
    email: 'البريد الإلكتروني',
    website: 'الموقع الإلكتروني',
    noData: 'غير متاح',
  },
  actions: {
    viewDetails: 'عرض التفاصيل',
    joinNow: 'انضم الآن',
    pin: 'تثبيت',
    pinned: 'مثبّت',
    compare: 'مقارنة',
    retry: 'إعادة المحاولة',
    refresh: 'تحديث',
    clearFilters: 'إعادة ضبط الفلاتر',
    showFilters: 'إظهار الفلاتر',
    hideFilters: 'إخفاء الفلاتر',
    listMode: 'قائمة',
    mapMode: 'خريطة',
    loadMore: 'عرض المزيد',
    clearPin: 'إلغاء التثبيت',
    openMap: 'فتح الخريطة',
    openAcademies: 'اكتشف الأكاديميات',
    backToAcademies: 'العودة إلى الأكاديميات',
    done: 'تم',
    call: 'اتصال',
    email: 'بريد',
    website: 'فتح الموقع',
    getDirections: 'الاتجاهات',
  },
  empty: {
    title: 'لا توجد أكاديميات',
    description: 'جرّب تعديل الفلاتر أو البحث.',
  },
  compare: {
    title: 'مقارنة الأكاديميات',
  },
  errors: {
    loadAcademies: 'تعذر تحميل الأكاديميات.',
    loadMapAcademies: 'تعذر تحميل أكاديميات الخريطة.',
    loadTemplate: 'تعذر تحميل تفاصيل الأكاديمية.',
    submitJoin: 'تعذر إرسال طلب الانضمام.',
    mapUnsupported: 'عرض الخريطة غير متاح على هذا الجهاز.',
    network: 'مشكلة في الشبكة. تحقق من الاتصال.',
    server: 'مشكلة في الخادم. حاول لاحقاً.',
    config: 'خدمة اكتشاف الأكاديميات غير مهيأة.',
    notFound: 'الأكاديمية المطلوبة غير موجودة.',
    invalidData: 'بعض الحقول غير صالحة.',
    generic: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
  },
};

const dictionaries = {
  en: EN,
  ar: AR,
};

const getByPath = (source, path) => {
  if (!source || !path) return undefined;

  return path.split('.').reduce((result, part) => {
    if (result && typeof result === 'object' && part in result) {
      return result[part];
    }
    return undefined;
  }, source);
};

const interpolate = (message, params = {}) =>
  String(message || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token) => {
    if (Object.prototype.hasOwnProperty.call(params, token)) {
      return String(params[token]);
    }
    return `{{${token}}}`;
  });

const toCleanText = (value) => String(value || '').trim();

export function getAcademyDiscoveryCopy(locale = 'en') {
  return String(locale || '').toLowerCase().startsWith('ar') ? dictionaries.ar : dictionaries.en;
}

export function tAcademyDiscovery(locale = 'en', key, params = {}) {
  const dict = getAcademyDiscoveryCopy(locale);
  const fallback = getAcademyDiscoveryCopy('en');
  const value = getByPath(dict, key) ?? getByPath(fallback, key) ?? key;
  if (typeof value !== 'string') return value;
  return interpolate(value, params);
}

export function resolveAcademyDiscoveryErrorMessage(
  error,
  locale = 'en',
  fallbackMessage = ''
) {
  const copy = getAcademyDiscoveryCopy(locale);
  const code = toCleanText(error?.code).toUpperCase();
  const rawMessage = toCleanText(error?.message);
  const isValidationMessage =
    rawMessage.toLowerCase() === 'invalid data' ||
    rawMessage.toLowerCase() === '[object object]';

  if (code === 'NETWORK_ERROR' || code === 'ABORT_ERROR' || code === 'TIMEOUT_ERROR') {
    return copy.errors.network;
  }
  if (code === 'SERVER_ERROR') return copy.errors.server;
  if (code === 'CONFIG_ERROR') return copy.errors.config;
  if (code === 'NOT_FOUND') return copy.errors.notFound;
  if (code === 'BAD_REQUEST' || code === 'VALIDATION_ERROR') {
    if (rawMessage && !isValidationMessage) return rawMessage;
    return copy.errors.invalidData;
  }

  return (
    toCleanText(error?.userMessage) ||
    rawMessage ||
    toCleanText(fallbackMessage) ||
    copy.errors.generic
  );
}

