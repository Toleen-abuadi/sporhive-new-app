export const ROUTES = Object.freeze({
  ROOT: '/',
  ONBOARDING_WELCOME: '/(onboarding)/welcome',
  ONBOARDING_ENTRY: '/(onboarding)/entry',
  AUTH_LOGIN: '/(auth)/login',
  AUTH_SIGNUP: '/(auth)/signup',
  AUTH_RESET_PASSWORD: '/(auth)/reset-password',
  PUBLIC_HOME: '/(public)/home',
  PLAYER_HOME: '/(player)/home',
  PLAYER_MORE: '/(player)/more',
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
  BOOKING_HOME: '/(booking)/home',
});

export function buildAuthLoginRoute(mode = 'player', lockMode = false) {
  const params = { mode };
  if (lockMode) {
    params.lockMode = '1';
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
