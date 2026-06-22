export const PLAYER_PORTAL_PROXY_BASE_PATH = '/player-portal-external-proxy';

export const PLAYER_PORTAL_ENDPOINTS = Object.freeze({
  login: '/auth/login',
  me: '/auth/me',
  passwordResetRequest: '/auth/password-reset/request',

  overview: '/player-profile/overview',
  profileGet: '/player-profile/overview',
  profileUpdate: '/player-profile/profile/update',
  subscriptionHistory: '/player-profile/subscription-history',
  subscriptionRequests: '/player-profile/subscription-requests',
  profileLeaderboard: '/player-profile/leaderboard',

  feedbackTypes: '/player-performance/feedback/types',
  feedbackPeriods: '/player-performance/feedback/periods',
  feedbackPlayerSummary: '/player-performance/feedback/player_summary',
  feedbackLeaderboard: '/player-performance/feedback/leaderboard',
  feedbackSearch: '/player-performance/feedback/search',
  feedbackSessionSummary: '/player-performance/feedback/session_summary',

  renewalsEligibility: '/registration/renewals/eligibility',
  renewalsOptions: '/registration/renewals/options',
  renewalsRequest: '/registration/renewals/request',

  freezesRequest: '/registration/freezes/request',
  freezesCancel: '/registration/freezes/cancel',
  freezesList: '/registration/freezes/list',

  uniformsStore: '/uniforms/store',
  uniformsOrder: '/uniforms/order',
  uniformsMyOrders: '/uniforms/my_orders',

  printInvoice: '/registration/print_invoice',
  newsList: '/news/list',
});

export const playerPortalKeys = Object.freeze({
  session: (sessionKey) => ['playerPortal', 'session', sessionKey || 'anonymous'],
  overview: (sessionKey) => ['playerPortal', 'overview', sessionKey || 'anonymous'],
  profile: (sessionKey) => ['playerPortal', 'profile', sessionKey || 'anonymous'],
  news: (sessionKey) => ['playerPortal', 'news', sessionKey || 'anonymous'],
});
