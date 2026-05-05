const EN = {
  title: 'Playgrounds',
  subtitle: 'Discover venues, choose your slot, and book in a few taps',
  searchHint: 'Browse by activity, date, players, and location',
  tabs: {
    all: 'All',
    offers: 'Offers',
    featured: 'Featured',
    premium: 'Premium',
    pro: 'Pro',
  },
  sort: {
    recommended: 'Recommended',
    distanceAsc: 'Nearest',
    priceAsc: 'Lowest price',
    priceDesc: 'Highest price',
    ratingDesc: 'Top rated',
  },
  labels: {
    activities: 'Activities',
    date: 'Date',
    players: 'Players',
    perSession: 'per session',
    mapReady: 'Map-ready venues',
    mapHint: '{{count}} venues include map coordinates',
    mapMode: 'Map mode',
    listMode: 'List mode',
    mapLoading: 'Loading map results...',
    mapEmpty: 'No mappable venues found for these filters.',
    mapNoCoordinates: 'Results were found but some venues are missing map coordinates.',
    mapConfigMissing: 'Map is unavailable. Missing EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN.',
    mapConfigHint: 'Add a public Mapbox token and rebuild the app to enable map mode.',
    mapUnsupportedHint: 'Mapbox requires a development build and does not run in Expo Go.',
    filters: 'Quick filters',
    filtersHint: 'Start browsing, then refine your results',
    activeFilters: 'Active filters',
    location: 'Location',
    locationPlaceholder: 'Area / city',
    clearLocation: 'Clear location',
    noLocationOptions: 'No location filters available yet.',
    noPlayersOptions: 'No player-count filters available yet.',
    anyDate: 'Any date',
    mapView: 'Map endpoint synced',
    mapHidden: 'Map view is not enabled on this screen yet.',
    selectedVenue: 'Selected venue',
    locationPermissionDenied: 'Location permission was denied. You can still browse the map.',
    emptySlots: 'No slots found for this date and duration.',
    noDurations: 'No duration options found for this venue.',
    academy: 'Academy',
    rating: 'Rating',
    playersRange: 'Players',
    specialOffer: 'Special offer',
    chooseSlot: 'Choose slot',
    chooseDuration: 'Choose duration',
    tags: 'Tags',
    payment: 'Payment',
    paymentDetails: 'Payment details',
    paymentCashAvailable: 'Cash payment available',
    paymentCashUnavailable: 'Cash payment unavailable',
    paymentCliqAvailable: 'CliQ transfer available',
    paymentCliqUnavailable: 'CliQ transfer unavailable',
    paymentCashOnDate: 'Pay cash on booking date',
    paymentCliqScreenshot: 'CliQ transfer screenshot',
    summary: 'Booking summary',
    canRate: 'Can rate',
    cannotRate: 'Cannot rate yet',
    distance: 'Distance',
    priceOnRequest: 'Price on request',
    noImage: 'No image',
    loadingActivities: 'Loading activities...',
    loadingSlots: 'Loading slots...',
    selectFieldToContinue: 'Complete this step to continue',
    minPlayers: 'Minimum players',
    maxPlayers: 'Maximum players',
    slotUnavailable: 'Please choose an available slot.',
    stepLabel: 'Step {{current}} of {{total}}',
    bookingCode: 'Booking code',
    paymentType: 'Payment type',
    paymentAmount: 'Payment amount',
    bookingActions: 'Booking actions',
    venue: 'Venue',
    defaultDuration: 'Default',
    price: 'Price',
    status: 'Status',
    cannotModify: 'This booking cannot be modified now.',
    statusFilter: 'Status filter',
    standardTier: 'Standard',
    contactNumber: 'Contact number',
    bookingDateTime: 'Booking date & time',
    notAvailable: 'N/A',
  },
  actions: {
    viewVenue: 'View venue',
    bookNow: 'Book now',
    mapMode: 'Map',
    listMode: 'List',
    searchThisArea: 'Search this area',
    search: 'Search',
    useMyLocation: 'Use my location',
    showResultsInArea: 'Show results in area',
    fitResults: 'Fit results',
    openSettings: 'Open settings',
    directions: 'Directions',
    openInMaps: 'Open in maps',
    openBooking: 'Open booking flow',
    myBookings: 'My bookings',
    retry: 'Retry',
    clearFilters: 'Reset',
    next: 'Continue',
    previous: 'Back',
    confirmBooking: 'Confirm booking',
    cancelBooking: 'Cancel booking',
    reschedule: 'Reschedule',
    submitRating: 'Submit rating',
    openRating: 'Rate booking',
    refresh: 'Refresh',
    viewPlaygrounds: 'View playgrounds',
    openMapDirections: 'Open map directions',
    loginToContinue: 'Login to continue',
    dismiss: 'Dismiss',
    confirmCancel: 'Confirm cancellation',
    showFilters: 'Show filters',
    hideFilters: 'Hide filters',
    clear: 'Clear',
    pickImage: 'Pick image',
    replaceImage: 'Replace image',
    removeImage: 'Remove image',
    call: 'Call',
    whatsapp: 'WhatsApp',
    close: 'Close',
  },
  sections: {
    discovery: 'Venue discovery',
    venueDetails: 'Venue details',
    bookingStepper: 'Booking steps',
    schedule: 'Schedule',
    slot: 'Slot',
    players: 'Players',
    payment: 'Payment',
    review: 'Review',
    myBookings: 'My bookings',
    myBookingsSubtitle: 'Track your venue bookings and manage updates',
    rateBooking: 'Rate booking',
  },
  booking: {
    step1Title: 'Choose date and duration',
    step2Title: 'Choose an available slot',
    step3Title: 'Select number of players',
    step4Title: 'Choose payment method',
    step5Title: 'Review and confirm',
    success: 'Booking created successfully.',
    updateSuccess: 'Booking updated successfully.',
    cancelSuccess: 'Booking cancelled successfully.',
    updateModeTitle: 'Update booking',
    updateModeHint: 'Choose a new date and slot, then confirm your update.',
    cancelConfirmPrompt: 'Are you sure you want to cancel this booking?',
    cancelContactTitle: 'Need to cancel your booking?',
    cancelContactDescription:
      'For safety and to avoid double-booking, cancellations are handled directly by the academy or playground manager.',
    cancelContactStep1: 'Contact the academy team or playground manager.',
    cancelContactStep2: 'Share your booking code and booking date/time.',
    cancelContactStep3: 'Wait for cancellation confirmation from the academy.',
    cancelContactMissingPhone: 'Academy phone number is not available for this booking.',
    cancelContactHint: 'Use the buttons below to call or WhatsApp the academy.',
    selectDurationFirst: 'Please select a duration first.',
    pickCliqImage: 'CliQ payment requires a transfer screenshot.',
    incomplete: 'Please complete all required fields.',
  },
  errors: {
    loadActivities: 'Could not load activities.',
    loadVenues: 'Could not load venues.',
    loadVenue: 'Could not load venue details.',
    loadSlots: 'Could not load available slots.',
    loadBookings: 'Could not load your bookings.',
    actionFailed: 'Request failed. Please try again.',
    userContextMissing: 'Public user context is missing for this action.',
    ratingResolveFailed: 'Invalid or expired rating link.',
    scheduleRequired: 'Please choose date, duration, and slot first.',
    playersOutOfRange: 'Players count is outside the allowed range.',
    paymentRequired: 'Please complete payment details before continuing.',
    cancelBlocked: 'This booking can no longer be cancelled.',
    updateBlocked: 'This booking can no longer be updated.',
    ownerOnly: 'Only the booking owner can modify this booking.',
    before24h: 'You can modify bookings only more than 24 hours before start time.',
    multipleActiveBookings:
      'You already have multiple active bookings. Please wait for them to be processed before creating new ones.',
    network: 'Network issue. Please check your connection.',
    server: 'Server issue. Please try again in a moment.',
    config: 'Playgrounds service is not configured yet.',
    notFound: 'Requested item was not found.',
    mapUnsupported: 'Map preview is not supported on this device/build.',
  },
  empty: {
    venuesTitle: 'No venues found',
    venuesDescription: 'Try changing filters or date.',
    filteredVenuesTitle: 'No results found',
    filteredVenuesDescription: 'Try adjusting filters and search again.',
    bookingsTitle: 'No bookings yet',
    bookingsDescription: 'Your active bookings will appear here.',
  },
  guards: {
    sessionLoading: 'Session is still loading.',
    tokenMissing: 'Session token is missing. Please sign in again.',
    browseUnavailable: 'Please sign in to continue.',
    bookingsUnavailable: 'Public user session is required to view bookings.',
    bookingUnavailable: 'Public user session is required to submit bookings.',
    ratingUnavailable: 'Public user session is required to submit ratings.',
  },
  rating: {
    title: 'Rate booking',
    subtitle: 'Share your experience after your session',
    overall: 'Overall rating',
    comment: 'Comment',
    commentPlaceholder: 'Optional feedback',
    submitted: 'Thanks for your rating.',
    requiresLogin: 'Sign in with the booking account to continue rating.',
    wrongAccount: 'This rating link belongs to another account. Sign in with the booking account.',
    alreadyRated: 'This booking has already been rated.',
    ownerOnly: 'Only the booking owner can submit a rating.',
    approvedOnly: 'Only approved bookings can be rated.',
    afterEndOnly: 'Rating is available only after the booking end time.',
    unavailableTemporary: 'Rating is temporarily unavailable for this booking.',
  },
};

const AR = {
  title: 'الملاعب',
  subtitle: 'اكتشف الملاعب واختر الموعد المناسب واحجز بسهولة',
  searchHint: 'تصفح حسب النشاط والتاريخ وعدد اللاعبين والموقع',
  tabs: {
    all: 'الكل',
    offers: 'العروض',
    featured: 'مميز',
    premium: 'بريميوم',
    pro: 'برو',
  },
  sort: {
    recommended: 'مقترح',
    distanceAsc: 'الأقرب',
    priceAsc: 'الأقل سعراً',
    priceDesc: 'الأعلى سعراً',
    ratingDesc: 'الأعلى تقييماً',
  },
  labels: {
    activities: 'الأنشطة',
    date: 'التاريخ',
    players: 'اللاعبون',
    perSession: 'لكل حجز',
    mapReady: 'ملاعب جاهزة للخريطة',
    mapHint: 'يوجد {{count}} ملعب مع إحداثيات',
    mapMode: 'وضع الخريطة',
    listMode: 'وضع القائمة',
    mapLoading: 'جارٍ تحميل نتائج الخريطة...',
    mapEmpty: 'لا توجد ملاعب قابلة للعرض على الخريطة بهذه الفلاتر.',
    mapNoCoordinates: 'تم العثور على نتائج، لكن بعض الملاعب بدون إحداثيات.',
    mapConfigMissing: 'الخريطة غير متاحة. ينقص EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN.',
    mapConfigHint: 'أضف رمز Mapbox عام ثم أعد بناء التطبيق لتفعيل الخريطة.',
    mapUnsupportedHint: 'الخريطة تحتاج إلى Development Build ولا تعمل في Expo Go.',
    filters: 'فلاتر سريعة',
    filtersHint: 'ابدأ بالتصفح أولاً ثم حدّد النتائج',
    activeFilters: 'الفلاتر النشطة',
    location: 'الموقع',
    locationPlaceholder: 'المنطقة / المدينة',
    clearLocation: 'مسح الموقع',
    noLocationOptions: 'لا توجد فلاتر موقع متاحة حالياً.',
    noPlayersOptions: 'لا توجد فلاتر عدد لاعبين متاحة حالياً.',
    anyDate: 'أي تاريخ',
    mapView: 'تمت مزامنة مسار الخريطة',
    mapHidden: 'عرض الخريطة غير مفعّل في هذه الشاشة حالياً.',
    selectedVenue: 'الملعب المحدد',
    locationPermissionDenied: 'تم رفض إذن الموقع. يمكنك مع ذلك متابعة تصفح الخريطة.',
    emptySlots: 'لا توجد مواعيد متاحة لهذا التاريخ والمدة.',
    noDurations: 'لا توجد مدد متاحة لهذا الملعب.',
    academy: 'الأكاديمية',
    rating: 'التقييم',
    playersRange: 'عدد اللاعبين',
    specialOffer: 'عرض خاص',
    chooseSlot: 'اختر الموعد',
    chooseDuration: 'اختر المدة',
    tags: 'الوسوم',
    payment: 'الدفع',
    paymentDetails: 'تفاصيل الدفع',
    paymentCashAvailable: 'الدفع النقدي متاح',
    paymentCashUnavailable: 'الدفع النقدي غير متاح',
    paymentCliqAvailable: 'الدفع عبر كليك متاح',
    paymentCliqUnavailable: 'الدفع عبر كليك غير متاح',
    paymentCashOnDate: 'الدفع نقداً يوم الحجز',
    paymentCliqScreenshot: 'صورة تحويل كليك',
    summary: 'ملخص الحجز',
    canRate: 'يمكن التقييم',
    cannotRate: 'لا يمكن التقييم حالياً',
    distance: 'المسافة',
    priceOnRequest: 'السعر عند الطلب',
    noImage: 'لا توجد صورة',
    loadingActivities: 'جارٍ تحميل الأنشطة...',
    loadingSlots: 'جارٍ تحميل المواعيد...',
    selectFieldToContinue: 'أكمل هذه الخطوة للمتابعة',
    minPlayers: 'الحد الأدنى للاعبين',
    maxPlayers: 'الحد الأقصى للاعبين',
    slotUnavailable: 'يرجى اختيار موعد متاح.',
    stepLabel: 'الخطوة {{current}} من {{total}}',
    bookingCode: 'رمز الحجز',
    paymentType: 'طريقة الدفع',
    paymentAmount: 'قيمة الدفع',
    bookingActions: 'إجراءات الحجز',
    venue: 'الملعب',
    defaultDuration: 'افتراضي',
    price: 'السعر',
    status: 'الحالة',
    cannotModify: 'لا يمكن تعديل هذا الحجز الآن.',
    statusFilter: 'فلتر الحالة',
    standardTier: 'عادي',
    contactNumber: 'رقم التواصل',
    bookingDateTime: 'تاريخ ووقت الحجز',
    notAvailable: 'غير متاح',
  },
  actions: {
    viewVenue: 'عرض الملعب',
    bookNow: 'احجز الآن',
    mapMode: 'خريطة',
    listMode: 'قائمة',
    searchThisArea: 'ابحث في هذه المنطقة',
    search: 'بحث',
    useMyLocation: 'استخدم موقعي',
    showResultsInArea: 'أظهر نتائج هذه المنطقة',
    fitResults: 'إظهار كل النتائج',
    openSettings: 'فتح الإعدادات',
    directions: 'الاتجاهات',
    openInMaps: 'فتح في الخرائط',
    openBooking: 'بدء الحجز',
    myBookings: 'حجوزاتي',
    retry: 'إعادة المحاولة',
    clearFilters: 'إعادة ضبط',
    next: 'متابعة',
    previous: 'رجوع',
    confirmBooking: 'تأكيد الحجز',
    cancelBooking: 'إلغاء الحجز',
    reschedule: 'إعادة الجدولة',
    submitRating: 'إرسال التقييم',
    openRating: 'تقييم الحجز',
    refresh: 'تحديث',
    viewPlaygrounds: 'عرض الملاعب',
    openMapDirections: 'فتح الاتجاهات',
    loginToContinue: 'تسجيل الدخول للمتابعة',
    dismiss: 'إغلاق',
    confirmCancel: 'تأكيد الإلغاء',
    showFilters: 'عرض الفلاتر',
    hideFilters: 'إخفاء الفلاتر',
    clear: 'مسح',
    pickImage: 'اختيار صورة',
    replaceImage: 'استبدال الصورة',
    removeImage: 'إزالة الصورة',
    call: 'اتصال',
    whatsapp: 'واتساب',
    close: 'إغلاق',
  },
  sections: {
    discovery: 'استكشاف الملاعب',
    venueDetails: 'تفاصيل الملعب',
    bookingStepper: 'خطوات الحجز',
    schedule: 'الجدولة',
    slot: 'الموعد',
    players: 'اللاعبون',
    payment: 'الدفع',
    review: 'المراجعة',
    myBookings: 'حجوزاتي',
    myBookingsSubtitle: 'تابع حجوزات الملاعب وقم بإدارة التعديلات',
    rateBooking: 'تقييم الحجز',
  },
  booking: {
    step1Title: 'اختر التاريخ والمدة',
    step2Title: 'اختر موعداً متاحاً',
    step3Title: 'اختر عدد اللاعبين',
    step4Title: 'اختر طريقة الدفع',
    step5Title: 'راجع وأكد الحجز',
    success: 'تم إنشاء الحجز بنجاح.',
    updateSuccess: 'تم تحديث الحجز بنجاح.',
    cancelSuccess: 'تم إلغاء الحجز بنجاح.',
    updateModeTitle: 'تعديل الحجز',
    updateModeHint: 'اختر تاريخاً وموعداً جديدين ثم أكد التعديل.',
    cancelConfirmPrompt: 'هل أنت متأكد من إلغاء هذا الحجز؟',
    cancelContactTitle: 'تحتاج إلى إلغاء حجزك؟',
    cancelContactDescription:
      'للسلامة وتجنباً للحجوزات المتضاربة، يتم الإلغاء مباشرةً عبر الأكاديمية أو مدير الملعب.',
    cancelContactStep1: 'تواصل مع فريق الأكاديمية أو مدير الملعب.',
    cancelContactStep2: 'زوّدهم برمز الحجز وتاريخ/وقت الحجز.',
    cancelContactStep3: 'انتظر تأكيد إلغاء الحجز من الأكاديمية.',
    cancelContactMissingPhone: 'رقم هاتف الأكاديمية غير متوفر لهذا الحجز.',
    cancelContactHint: 'استخدم الأزرار بالأسفل للاتصال أو واتساب.',
    selectDurationFirst: 'يرجى اختيار المدة أولاً.',
    pickCliqImage: 'الدفع عبر كليك يتطلب صورة التحويل.',
    incomplete: 'يرجى استكمال جميع الحقول المطلوبة.',
  },
  errors: {
    loadActivities: 'تعذر تحميل الأنشطة.',
    loadVenues: 'تعذر تحميل الملاعب.',
    loadVenue: 'تعذر تحميل تفاصيل الملعب.',
    loadSlots: 'تعذر تحميل المواعيد المتاحة.',
    loadBookings: 'تعذر تحميل الحجوزات.',
    actionFailed: 'فشل الطلب، يرجى المحاولة مرة أخرى.',
    userContextMissing: 'سياق المستخدم العام غير متوفر لهذا الإجراء.',
    ratingResolveFailed: 'رابط التقييم غير صالح أو منتهي.',
    scheduleRequired: 'يرجى اختيار التاريخ والمدة والموعد أولاً.',
    playersOutOfRange: 'عدد اللاعبين خارج النطاق المسموح.',
    paymentRequired: 'يرجى استكمال تفاصيل الدفع قبل المتابعة.',
    cancelBlocked: 'لا يمكن إلغاء هذا الحجز حالياً.',
    updateBlocked: 'لا يمكن تعديل هذا الحجز حالياً.',
    ownerOnly: 'فقط صاحب الحجز يمكنه التعديل.',
    before24h: 'يمكن تعديل الحجز فقط قبل أكثر من 24 ساعة من وقت البداية.',
    multipleActiveBookings:
      'لديك عدة حجوزات نشطة بالفعل. يرجى الانتظار حتى تتم معالجتها قبل إنشاء حجز جديد.',
    network: 'مشكلة في الشبكة. يرجى التحقق من اتصالك.',
    server: 'مشكلة في الخادم. يرجى المحاولة بعد قليل.',
    config: 'خدمة الملاعب غير مكتملة الإعداد.',
    notFound: 'العنصر المطلوب غير موجود.',
    mapUnsupported: 'عرض الخريطة غير متاح على هذا الجهاز أو هذا البناء.',
  },
  empty: {
    venuesTitle: 'لا توجد ملاعب',
    venuesDescription: 'جرّب تغيير الفلاتر أو التاريخ.',
    filteredVenuesTitle: 'لا توجد نتائج',
    filteredVenuesDescription: 'جرّب تعديل الفلاتر والبحث مرة أخرى.',
    bookingsTitle: 'لا توجد حجوزات بعد',
    bookingsDescription: 'ستظهر حجوزاتك النشطة هنا.',
  },
  guards: {
    sessionLoading: 'ما زال تحميل الجلسة جارياً.',
    tokenMissing: 'رمز الجلسة غير متوفر. يرجى تسجيل الدخول مرة أخرى.',
    browseUnavailable: 'يرجى تسجيل الدخول للمتابعة.',
    bookingsUnavailable: 'تحتاج إلى جلسة مستخدم عام لعرض الحجوزات.',
    bookingUnavailable: 'تحتاج إلى جلسة مستخدم عام لإرسال الحجز.',
    ratingUnavailable: 'تحتاج إلى جلسة مستخدم عام لإرسال التقييم.',
  },
  rating: {
    title: 'تقييم الحجز',
    subtitle: 'شارك تجربتك بعد انتهاء الجلسة',
    overall: 'التقييم العام',
    comment: 'تعليق',
    commentPlaceholder: 'ملاحظات اختيارية',
    submitted: 'شكراً على التقييم.',
    requiresLogin: 'سجل الدخول بحساب الحجز لمتابعة التقييم.',
    wrongAccount: 'هذا رابط تقييم يخص حساباً آخر. سجل الدخول بحساب الحجز.',
    alreadyRated: 'تم تقييم هذا الحجز سابقاً.',
    ownerOnly: 'فقط صاحب الحجز يمكنه إرسال التقييم.',
    approvedOnly: 'يمكن تقييم الحجوزات المعتمدة فقط.',
    afterEndOnly: 'يتاح التقييم بعد انتهاء وقت الحجز فقط.',
    unavailableTemporary: 'التقييم غير متاح مؤقتاً لهذا الحجز.',
  },
};

const VENUE_DETAILS_COPY = {
  en: {
    quickStats: 'Quick Snapshot',
    about: 'About Venue',
    specs: 'Venue Details',
    durations: 'Duration Options',
    highlights: 'Academy Highlights',
    amenities: 'Amenities & Features',
    location: 'Location',
    notes: 'Notes & Policies',
    readMore: 'Read more',
    readLess: 'Show less',
    paymentMethods: 'Payment Methods',
    secureBooking: 'Secure booking',
    secureBookingHint: 'Bookings are processed safely through SporHive and the academy.',
    noDescription: 'No additional venue description is available right now.',
    activity: 'Activity',
    venueType: 'Venue type',
    pitchSize: 'Pitch size',
    areaSize: 'Area size',
    tier: 'Marketplace tier',
    coordinates: 'Coordinates',
    noDurations: 'No duration options available yet.',
  },
  ar: {
    quickStats: '\u0645\u0644\u062e\u0635 \u0633\u0631\u064a\u0639',
    about: '\u0639\u0646 \u0627\u0644\u0645\u0644\u0639\u0628',
    specs: '\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0645\u0644\u0639\u0628',
    durations: '\u062e\u064a\u0627\u0631\u0627\u062a \u0627\u0644\u0645\u062f\u0629',
    highlights: '\u0645\u0645\u064a\u0632\u0627\u062a \u0627\u0644\u0623\u0643\u0627\u062f\u064a\u0645\u064a\u0629',
    amenities: '\u0627\u0644\u062e\u062f\u0645\u0627\u062a \u0648\u0627\u0644\u0645\u0631\u0627\u0641\u0642',
    location: '\u0627\u0644\u0645\u0648\u0642\u0639',
    notes: '\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0648\u0633\u064a\u0627\u0633\u0627\u062a',
    readMore: '\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0645\u0632\u064a\u062f',
    readLess: '\u0625\u062e\u0641\u0627\u0621',
    paymentMethods: '\u0637\u0631\u0642 \u0627\u0644\u062f\u0641\u0639',
    secureBooking: '\u062d\u062c\u0632 \u0622\u0645\u0646',
    secureBookingHint:
      '\u064a\u062a\u0645 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062d\u062c\u0632 \u0628\u0623\u0645\u0627\u0646 \u0639\u0628\u0631 SporHive \u0648\u0627\u0644\u0623\u0643\u0627\u062f\u064a\u0645\u064a\u0629.',
    noDescription: '\u0644\u0627 \u064a\u0648\u062c\u062f \u0648\u0635\u0641 \u0625\u0636\u0627\u0641\u064a \u062d\u0627\u0644\u064a\u0627\u064b.',
    activity: '\u0627\u0644\u0646\u0634\u0627\u0637',
    venueType: '\u0646\u0648\u0639 \u0627\u0644\u0645\u0644\u0639\u0628',
    pitchSize: '\u0645\u0642\u0627\u0633 \u0627\u0644\u0645\u0644\u0639\u0628',
    areaSize: '\u0627\u0644\u0645\u0633\u0627\u062d\u0629',
    tier: '\u0641\u0626\u0629 \u0627\u0644\u0639\u0631\u0636',
    coordinates: '\u0627\u0644\u0625\u062d\u062f\u0627\u062b\u064a\u0627\u062a',
    noDurations: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u062f\u062f \u0645\u062a\u0627\u062d\u0629 \u062d\u0627\u0644\u064a\u0627\u064b.',
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
const hasArabicText = (value) => /[\u0600-\u06FF]/.test(toCleanText(value));
const includesAny = (value, fragments = []) => fragments.some((fragment) => value.includes(fragment));

const resolveErrorByMessageText = (message, copy) => {
  const normalized = toCleanText(message).toLowerCase();
  if (!normalized) return '';

  if (includesAny(normalized, ['network', 'failed to fetch', 'timeout', 'timed out', 'internet'])) {
    return copy.errors.network;
  }

  if (includesAny(normalized, ['unauthorized', 'unauthenticated', 'token', 'public user'])) {
    return copy.errors.userContextMissing;
  }

  if (includesAny(normalized, ['not found', 'no such'])) {
    return copy.errors.notFound;
  }

  if (includesAny(normalized, ['config', 'base url', 'expo_public_api_base_url'])) {
    return copy.errors.config;
  }

  if (includesAny(normalized, ['server error', 'internal server', '500'])) {
    return copy.errors.server;
  }

  if (includesAny(normalized, ['24 hours', '24h', 'less than 24'])) {
    return copy.errors.before24h;
  }

  if (
    includesAny(normalized, ['multiple active bookings', 'too many pending bookings', 'max pending']) ||
    (includesAny(normalized, ['active bookings']) &&
      includesAny(normalized, ['wait', 'processed', 'before creating new']))
  ) {
    return copy.errors.multipleActiveBookings;
  }

  if (
    includesAny(normalized, ['slot', 'time slot']) &&
    includesAny(normalized, ['not available', 'unavailable', 'already booked', 'taken'])
  ) {
    return copy.labels.slotUnavailable;
  }

  if (includesAny(normalized, ['duration']) && includesAny(normalized, ['required', 'select'])) {
    return copy.booking.selectDurationFirst;
  }

  if (
    includesAny(normalized, ['players', 'number of players']) &&
    includesAny(normalized, ['invalid', 'range', 'out of', 'minimum', 'maximum'])
  ) {
    return copy.errors.playersOutOfRange;
  }

  if (includesAny(normalized, ['payment']) && includesAny(normalized, ['required', 'invalid', 'missing'])) {
    return copy.errors.paymentRequired;
  }

  if (
    includesAny(normalized, ['cancel']) &&
    includesAny(normalized, ['cannot', "can't", 'blocked', 'not allowed'])
  ) {
    return copy.errors.cancelBlocked;
  }

  if (
    includesAny(normalized, ['update', 'reschedule', 'modify']) &&
    includesAny(normalized, ['cannot', "can't", 'blocked', 'not allowed'])
  ) {
    return copy.errors.updateBlocked;
  }

  if (includesAny(normalized, ['owner', 'another account', 'belongs to another'])) {
    return copy.errors.ownerOnly;
  }

  if (includesAny(normalized, ['required field', 'incomplete'])) {
    return copy.booking.incomplete;
  }

  return '';
};

export function getPlaygroundsCopy(locale = 'en') {
  return locale === 'ar' ? dictionaries.ar : dictionaries.en;
}

export function getPlaygroundsVenueDetailsCopy(locale = 'en') {
  return locale === 'ar' ? VENUE_DETAILS_COPY.ar : VENUE_DETAILS_COPY.en;
}

export function tPlaygrounds(locale = 'en', key, params = {}) {
  const dict = getPlaygroundsCopy(locale);
  const fallback = getPlaygroundsCopy('en');
  const value = getByPath(dict, key) ?? getByPath(fallback, key) ?? key;
  if (typeof value !== 'string') return value;
  return interpolate(value, params);
}

export function resolvePlaygroundsErrorMessage(error, locale = 'en', fallbackMessage = '') {
  const copy = getPlaygroundsCopy(locale);
  const isArabic = locale === 'ar';
  const code = toCleanText(error?.code || error?.details?.code || error?.details?.error_code).toUpperCase();

  if (code === 'NETWORK_ERROR') return copy.errors.network;
  if (code === 'SERVER_ERROR') return copy.errors.server;
  if (code === 'CONFIG_ERROR') return copy.errors.config;
  if (code === 'NOT_FOUND') return copy.errors.notFound;
  if (code === 'MAX_PENDING_BOOKINGS' || code === 'BOOKING_LIMIT_REACHED') {
    return copy.errors.multipleActiveBookings;
  }

  if (
    code === 'USER_ID_MISSING' ||
    code === 'TOKEN_MISSING' ||
    code === 'UNAUTHORIZED' ||
    code === 'UNAUTHENTICATED' ||
    code === 'PLAYGROUNDS_GUARD_FAILED'
  ) {
    return copy.errors.userContextMissing;
  }

  if (code === 'USER_ID_MISMATCH') return copy.rating.wrongAccount;

  const candidates = [
    error?.userMessage,
    error?.details?.message,
    error?.details?.error,
    error?.message,
    fallbackMessage,
  ].map(toCleanText).filter(Boolean);

  for (const candidate of candidates) {
    const mapped = resolveErrorByMessageText(candidate, copy);
    if (mapped) return mapped;
  }

  const explicitFallback = toCleanText(fallbackMessage);
  if (isArabic) {
    if (explicitFallback && hasArabicText(explicitFallback)) return explicitFallback;
    return copy.errors.actionFailed;
  }

  return candidates[0] || explicitFallback || copy.errors.actionFailed;
}

