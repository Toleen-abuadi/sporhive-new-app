export const ROUTES = Object.freeze({
  ROOT: '/',
  ONBOARDING_WELCOME: '/(onboarding)/welcome',
  ONBOARDING_ENTRY: '/(onboarding)/entry',
  AUTH_LOGIN: '/(auth)/login',
  AUTH_SIGNUP: '/(auth)/signup',
  AUTH_RESET_PASSWORD: '/(auth)/reset-password',
  PUBLIC_HOME: '/(public)/home',
  ACADEMIES_HOME: '/(public)/academies',
  ACADEMY_TEMPLATE: '/(public)/academies/[slug]',
  ACADEMY_JOIN: '/(public)/academies/[slug]/join',
  PLAYGROUNDS_HOME: '/(public)/playgrounds',
  PLAYGROUNDS_MAP: '/(public)/playgrounds/map',
  PLAYGROUND_VENUE: '/(public)/playgrounds/venue/[venueId]',
  PLAYGROUND_BOOKING: '/(public)/playgrounds/booking/[venueId]',
  PLAYGROUNDS_MY_BOOKINGS: '/(public)/playgrounds/my-bookings',
  PLAYGROUNDS_RATING: '/(public)/playgrounds/rating/[bookingId]',
  PLAYGROUNDS_RATING_TOKEN: '/(public)/playgrounds/rating-token/[token]',
  PLAYER_HOME: '/(player)/home',
  PLAYER_PAYMENTS: '/(player)/payments',
  PLAYER_PAYMENT_DETAILS: '/(player)/payments/[paymentId]',
  PLAYER_PAYMENT_INVOICE: '/(player)/payments/[paymentId]/invoice',
  PLAYER_PERFORMANCE: '/(player)/performance',
  PLAYER_STORE: '/(player)/store',
  PLAYER_STORE_PRODUCT: '/(player)/store/product/[productId]',
  PLAYER_STORE_CART: '/(player)/store/cart',
  PLAYER_STORE_CHECKOUT: '/(player)/store/checkout',
  PLAYER_STORE_ORDERS: '/(player)/store/orders',
  PLAYER_STORE_ORDER_DETAILS: '/(player)/store/orders/[orderRef]',
  PLAYER_NEWS: '/(player)/news',
  PLAYER_NEWS_DETAIL: '/(player)/news/[newsId]',
  PLAYER_FREEZE: '/(player)/freeze',
  PLAYER_RENEWAL: '/(player)/renewal',
  PLAYER_PROFILE: '/(player)/profile',
  PLAYER_PROFILE_EDIT: '/(player)/profile/edit',
  BOOKING_HOME: '/(public)/playgrounds',
  SETTINGS_HOME: '/(settings)/',
});

export function buildAuthLoginRoute(mode = 'player', lockMode = false, redirectTo = '') {
  const params = { mode };
  if (lockMode) {
    params.lockMode = '1';
  }
  if (redirectTo) {
    params.redirectTo = normalizeRouteParam(redirectTo);
  }

  return {
    pathname: ROUTES.AUTH_LOGIN,
    params,
  };
}

const normalizeRouteParam = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

export function buildPlayerPaymentDetailsRoute(paymentId) {
  return {
    pathname: ROUTES.PLAYER_PAYMENT_DETAILS,
    params: {
      paymentId: normalizeRouteParam(paymentId),
    },
  };
}

export function buildPlayerPaymentInvoiceRoute(paymentId) {
  return {
    pathname: ROUTES.PLAYER_PAYMENT_INVOICE,
    params: {
      paymentId: normalizeRouteParam(paymentId),
    },
  };
}

export function buildPlayerNewsDetailRoute(newsId) {
  return {
    pathname: ROUTES.PLAYER_NEWS_DETAIL,
    params: {
      newsId: normalizeRouteParam(newsId),
    },
  };
}

export function buildPlayerStoreProductRoute(productId) {
  return {
    pathname: ROUTES.PLAYER_STORE_PRODUCT,
    params: {
      productId: normalizeRouteParam(productId),
    },
  };
}

export function buildPlayerStoreOrderDetailsRoute(orderRef) {
  return {
    pathname: ROUTES.PLAYER_STORE_ORDER_DETAILS,
    params: {
      orderRef: normalizeRouteParam(orderRef),
    },
  };
}

export function buildPlaygroundVenueRoute(venueId) {
  return {
    pathname: ROUTES.PLAYGROUND_VENUE,
    params: {
      venueId: normalizeRouteParam(venueId),
    },
  };
}

export function buildPlaygroundsHomeRoute(params = {}) {
  return {
    pathname: ROUTES.PLAYGROUNDS_HOME,
    params,
  };
}

export function buildPlaygroundsMapRoute(params = {}) {
  return {
    pathname: ROUTES.PLAYGROUNDS_MAP,
    params,
  };
}

export function buildAcademyTemplateRoute(slug) {
  return {
    pathname: ROUTES.ACADEMY_TEMPLATE,
    params: {
      slug: normalizeRouteParam(slug),
    },
  };
}

export function buildAcademyJoinRoute(slug) {
  return {
    pathname: ROUTES.ACADEMY_JOIN,
    params: {
      slug: normalizeRouteParam(slug),
    },
  };
}

export function buildPlaygroundBookingRoute(venueId, params = {}) {
  return {
    pathname: ROUTES.PLAYGROUND_BOOKING,
    params: {
      venueId: normalizeRouteParam(venueId),
      ...params,
    },
  };
}

export function buildPlaygroundsRatingRoute(bookingId, params = {}) {
  return {
    pathname: ROUTES.PLAYGROUNDS_RATING,
    params: {
      bookingId: normalizeRouteParam(bookingId),
      ...params,
    },
  };
}

export function buildPlaygroundsRatingTokenRoute(token) {
  return {
    pathname: ROUTES.PLAYGROUNDS_RATING_TOKEN,
    params: {
      token: normalizeRouteParam(token),
    },
  };
}
