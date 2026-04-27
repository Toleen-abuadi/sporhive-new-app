// durations are per VENUE now
export const VENUE_DURATION_OPTIONS = [
  { id: '', minutes: null, labelEn: 'Any duration', labelAr: 'أي مدة' },
  { id: '30min', minutes: 30, labelEn: '30 minutes', labelAr: '30 دقيقة' },
  { id: '60min', minutes: 60, labelEn: '1 hour', labelAr: 'ساعة واحدة' },
  { id: '90min', minutes: 90, labelEn: '1.5 hours', labelAr: 'ساعة ونصف' },
  { id: '120min', minutes: 120, labelEn: '2 hours', labelAr: 'ساعتان' },
];

export const ACTIVITY_TYPE_OPTIONS = [
  {
    id: '',
    key: 'all',
    nameEn: 'All sports',
    nameAr: 'كل الرياضات',
    icon: null,
    color: '#607D8B',
  },
  {
    id: 'football',
    key: 'football',
    nameEn: 'Football',
    nameAr: 'كرة القدم',
    icon: null,
    color: '#4CAF50',
  },
  {
    id: 'basketball',
    key: 'basketball',
    nameEn: 'Basketball',
    nameAr: 'كرة السلة',
    icon: null,
    color: '#FF5722',
  },
  {
    id: 'tennis',
    key: 'tennis',
    nameEn: 'Tennis',
    nameAr: 'التنس',
    icon: null,
    color: '#2196F3',
  },
  {
    id: 'swimming',
    key: 'swimming',
    nameEn: 'Swimming',
    nameAr: 'السباحة',
    icon: null,
    color: '#00BCD4',
  },
  {
    id: 'gym',
    key: 'gym',
    nameEn: 'Gym',
    nameAr: 'النادي الرياضي',
    icon: null,
    color: '#9C27B0',
  },
  {
    id: 'padel',
    key: 'padel',
    nameEn: 'Padel',
    nameAr: 'بادل',
    icon: null,
    color: '#8BC34A',
  },
  {
    id: 'volleyball',
    key: 'volleyball',
    nameEn: 'Volleyball',
    nameAr: 'كرة الطائرة',
    icon: null,
    color: '#FFC107',
  },
  {
    id: 'badminton',
    key: 'badminton',
    nameEn: 'Badminton',
    nameAr: 'الريشة الطائرة',
    icon: null,
    color: '#3F51B5',
  },
  {
    id: 'table-tennis',
    key: 'table-tennis',
    nameEn: 'Table tennis',
    nameAr: 'تنس الطاولة',
    icon: null,
    color: '#009688',
  },
  {
    id: 'handball',
    key: 'handball',
    nameEn: 'Handball',
    nameAr: 'كرة اليد',
    icon: null,
    color: '#E91E63',
  },
];

export const ACADEMY_TAG_OPTIONS = [
  {
    id: 'indoor',
    labelEn: 'Indoor',
    labelAr: 'ملعب داخلي',
  },
  {
    id: 'outdoor',
    labelEn: 'Outdoor',
    labelAr: 'ملعب خارجي',
  },
  {
    id: 'parking',
    labelEn: 'Parking available',
    labelAr: 'موقف سيارات متوفر',
  },
  {
    id: 'showers',
    labelEn: 'Showers & changing rooms',
    labelAr: 'غرف تبديل وحمامات',
  },
  {
    id: 'cafeteria',
    labelEn: 'Cafeteria / snacks',
    labelAr: 'مقهى / وجبات خفيفة',
  },
  {
    id: 'kids_friendly',
    labelEn: 'Kids friendly',
    labelAr: 'مناسب للأطفال',
  },
  {
    id: 'ladies_only',
    labelEn: 'Ladies only times',
    labelAr: 'أوقات خاصة للسيدات',
  },
  {
    id: 'air_conditioned',
    labelEn: 'Air-conditioned',
    labelAr: 'مكيّف',
  },
  {
    id: 'night_lighting',
    labelEn: 'Night lighting',
    labelAr: 'إضاءة ليلية',
  },
  {
    id: 'coach_available',
    labelEn: 'Coach available on request',
    labelAr: 'مدرب متوفر عند الطلب',
  },
];

export const VENUE_RATING_TYPES = [
  {
    id: 'cleanliness',
    labelEn: 'Facility Cleanliness',
    labelAr: 'نظافة المرافق',
  },
  {
    id: 'staff_service',
    labelEn: 'Staff Professionalism & Service',
    labelAr: 'احترافية وخدمة الموظفين',
  },
  {
    id: 'field_quality',
    labelEn: 'Field / Court Quality',
    labelAr: 'جودة الملعب أو الساحة',
  },
  {
    id: 'booking_experience',
    labelEn: 'Booking Experience',
    labelAr: 'تجربة الحجز',
  },
  {
    id: 'value_for_money',
    labelEn: 'Value for Money',
    labelAr: 'القيمة مقابل السعر',
  },
  {
    id: 'safety_security',
    labelEn: 'Safety & Security',
    labelAr: 'السلامة والأمان',
  },
];
