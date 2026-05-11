export const PLAYER_PORTAL_PROXY_BASE_PATH = '/player-portal-external-proxy';

export const PLAYER_PORTAL_ENDPOINTS = Object.freeze({
  OVERVIEW: '/player-profile/overview',
  PROFILE_GET: '/player-profile/profile/get',
  PROFILE_UPDATE: '/player-profile/profile/update',
  RENEWAL_ELIGIBILITY: '/registration/renewals/eligibility',
  RENEWAL_OPTIONS: '/registration/renewals/options',
  RENEWAL_REQUEST: '/registration/renewals/request',
  FREEZE_REQUEST: '/registration/freezes/request',
  FREEZE_CANCEL: '/registration/freezes/cancel',
  FREEZE_LIST: '/registration/freezes/list',
  NEWS_LIST: '/news/list',
  FEEDBACK_TYPES: '/player-performance/feedback/types',
  FEEDBACK_PERIODS: '/player-performance/feedback/periods',
  FEEDBACK_PLAYER_SUMMARY: '/player-performance/feedback/player_summary',
  FEEDBACK_LEADERBOARD: '/player-profile/leaderboard',
  UNIFORM_STORE: '/uniforms/store',
  UNIFORM_ORDER: '/uniforms/order',
  UNIFORM_ORDERS: '/uniforms/my_orders',
  PRINT_INVOICE: '/registration/print_invoice',
});

export const playerPortalKeys = Object.freeze({
  session: (sessionKey) => ['playerPortal', 'session', sessionKey || 'anonymous'],
  overview: (sessionKey) => ['playerPortal', 'overview', sessionKey || 'anonymous'],
  profile: (sessionKey) => ['playerPortal', 'profile', sessionKey || 'anonymous'],
  news: (sessionKey) => ['playerPortal', 'news', sessionKey || 'anonymous'],
});
