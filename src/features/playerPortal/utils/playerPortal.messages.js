import { PLAYER_PORTAL_GUARD_REASONS } from './playerPortal.guards';

export const resolvePortalGuardMessage = (reason, t) => {
  switch (reason) {
    case PLAYER_PORTAL_GUARD_REASONS.BOOTING:
      return t('common.loading');
    case PLAYER_PORTAL_GUARD_REASONS.UNAUTHENTICATED:
      return t('playerPortal.guards.unauthenticated');
    case PLAYER_PORTAL_GUARD_REASONS.NOT_PLAYER:
      return t('playerPortal.guards.notPlayer');
    case PLAYER_PORTAL_GUARD_REASONS.TOKEN_MISSING:
      return t('playerPortal.guards.missingToken');
    case PLAYER_PORTAL_GUARD_REASONS.ACADEMY_MISSING:
      return t('playerPortal.guards.missingAcademy');
    case PLAYER_PORTAL_GUARD_REASONS.PLAYER_ID_MISSING:
      return t('playerPortal.guards.missingPlayer');
    default:
      return t('playerPortal.guards.default');
  }
};
