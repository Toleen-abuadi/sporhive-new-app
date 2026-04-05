import { useCallback, useMemo } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import {
  CalendarClock,
  CreditCard,
  HandCoins,
  ShoppingBasket,
  ShieldPlus,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { AppScreen } from '../../../components/ui/AppScreen';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Text } from '../../../components/ui/Text';
import {
  ROUTES,
} from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { getRowDirection } from '../../../utils/rtl';
import { spacing } from '../../../theme/tokens';
import {
  PlayerHeaderCard,
  PlayerKpiCard,
  PortalEmptyState,
  PortalErrorState,
  PortalQuickActions,
  PortalSectionCard,
  PortalSkeletonCard,
  PortalStatusBadge,
} from '../components';
import { usePlayerOverview } from '../hooks';
import {
  formatAmountLabel,
  formatDateLabel,
  formatFreezeStatusLabel,
  formatNumberLabel,
  formatPaymentStatusLabel,
  formatStatusLabel,
} from '../utils/playerPortal.formatters';
import { resolvePortalGuardMessage } from '../utils/playerPortal.messages';

const resolveLastUpdated = (value, locale) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const intlLocale = locale === 'ar' ? 'ar-JO' : 'en-US';
  try {
    return parsed.toLocaleTimeString(intlLocale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const resolvePlayerImage = (overview) => {
  const image = String(overview?.profileImage?.image || '').trim();
  if (!image) return '';

  if (image.startsWith('http') || image.startsWith('data:image')) {
    return image;
  }

  const type = String(overview?.profileImage?.imageType || 'image/jpeg').trim();
  return `data:${type};base64,${image}`;
};

export function PlayerHomeScreen() {
  const router = useRouter();
  const { t, locale, isRTL } = useI18n();
  const { colors } = useTheme();
  const {
    overview,
    error,
    isLoading,
    isRefreshing,
    lastFetchedAt,
    canFetch,
    guardReason,
    refetch,
  } = usePlayerOverview();

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const quickActions = useMemo(
    () => [
      {
        key: 'payments',
        label: t('playerPortal.actions.payments'),
        icon: <CreditCard size={15} color={colors.accentOrange} strokeWidth={2.3} />,
        onPress: () => router.push(ROUTES.PLAYER_PAYMENTS),
      },
      {
        key: 'store',
        label: t('playerPortal.actions.store'),
        icon: <ShoppingBasket size={15} color={colors.accentOrange} strokeWidth={2.3} />,
        onPress: () => router.push(ROUTES.PLAYER_STORE),
      },
      {
        key: 'renewal',
        label: t('playerPortal.actions.renewal'),
        icon: <ShieldPlus size={15} color={colors.accentOrange} strokeWidth={2.3} />,
        onPress: () => router.push(ROUTES.PLAYER_RENEWAL),
      },
      {
        key: 'freeze',
        label: t('playerPortal.actions.freeze'),
        icon: <HandCoins size={15} color={colors.accentOrange} strokeWidth={2.3} />,
        onPress: () => router.push(ROUTES.PLAYER_FREEZE),
      },
    ],
    [colors.accentOrange, router, t]
  );

  const guardTitle = t('playerPortal.home.unavailableTitle');
  const guardDescription = resolvePortalGuardMessage(guardReason, t);
  const hasOverview = Boolean(overview);
  const isInitialLoading = isLoading && !hasOverview;
  const playerImage = resolvePlayerImage(overview);

  return (
    <AppScreen
      scroll
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.accentOrange}
          colors={[colors.accentOrange]}
        />
      }
    >
      <ScreenHeader
        title={t('playerPortal.home.title')}
        subtitle={t('playerPortal.home.subtitle')}
        right={<LanguageSwitch compact />}
      />

      {!canFetch ? (
        <PortalSectionCard>
          <PortalEmptyState title={guardTitle} description={guardDescription} />
        </PortalSectionCard>
      ) : null}

      {canFetch && isInitialLoading ? (
        <>
          <PortalSectionCard>
            <PortalSkeletonCard rows={[20, 14, 12]} />
          </PortalSectionCard>
          <PortalSectionCard>
            <PortalSkeletonCard rows={[16, 14, 12]} />
          </PortalSectionCard>
          <PortalSectionCard>
            <PortalSkeletonCard rows={[16, 14, 12]} />
          </PortalSectionCard>
        </>
      ) : null}

      {canFetch && !hasOverview && error ? (
        <PortalSectionCard>
          <PortalErrorState
            title={t('playerPortal.errors.overviewTitle')}
            error={error}
            fallbackMessage={t('playerPortal.errors.overviewFallback')}
            retryLabel={t('playerPortal.actions.retry')}
            onRetry={() => refetch()}
          />
        </PortalSectionCard>
      ) : null}

      {canFetch && hasOverview ? (
        <>
          <PlayerHeaderCard
            title={overview.player.displayName}
            subtitle={t('playerPortal.home.header.welcome')}
            academyLabel={t('playerPortal.home.header.academy', {
              name: overview.academyName || '-',
            })}
            playerIdLabel={t('playerPortal.home.header.playerId', {
              id: overview.player.id || '-',
            })}
            statusLabel={t('playerPortal.home.header.status', {
              status: formatStatusLabel(overview.subscription.status, {
                t,
                locale,
                domain: 'subscriptionState',
                fallback: '-',
              }),
            })}
            lastUpdatedLabel={t('playerPortal.home.header.updatedAt', {
              time: resolveLastUpdated(lastFetchedAt, locale) || '-',
            })}
            imageUri={playerImage}
          />

          <View style={styles.kpiRow}>
            <PlayerKpiCard
              label={t('playerPortal.home.kpis.remainingSessions')}
              value={formatNumberLabel(overview.summaries.sessionsRemaining, {
                locale,
                fallback: '0',
              })}
              hint={t('playerPortal.home.kpis.totalSessions', {
                count: formatNumberLabel(overview.summaries.totalSessions, {
                  locale,
                  fallback: '0',
                }),
              })}
              status={overview.subscription.status}
              style={styles.kpiCard}
            />
            <PlayerKpiCard
              label={t('playerPortal.home.kpis.creditBalance')}
              value={formatAmountLabel(overview.summaries.creditBalance, {
                locale,
                fallback: '0',
              })}
              hint={
                overview.summaries.nextCreditExpiry
                  ? t('playerPortal.home.kpis.nextExpiry', {
                      date: formatDateLabel(overview.summaries.nextCreditExpiry, {
                        locale,
                        fallback: '-',
                      }),
                    })
                  : t('playerPortal.home.kpis.noExpiry')
              }
              status={overview.credits.activeCount > 0 ? 'active' : 'inactive'}
              style={styles.kpiCard}
            />
            <PlayerKpiCard
              label={t('playerPortal.home.kpis.paymentStatus')}
              value={formatPaymentStatusLabel(overview.summaries.latestPaymentStatus, {
                t,
                locale,
                fallback: '-',
              })}
              hint={t('playerPortal.home.kpis.latestPayment')}
              status={overview.summaries.latestPaymentStatus}
              style={styles.kpiCard}
            />
          </View>

          <PortalSectionCard
            title={t('playerPortal.home.sections.subscriptionTitle')}
            subtitle={t('playerPortal.home.sections.subscriptionSubtitle')}
          >
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('playerPortal.home.subscription.course', {
                name: overview.subscription.courseName || '-',
              })}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('playerPortal.home.subscription.group', {
                name: overview.subscription.groupName || '-',
              })}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('playerPortal.home.subscription.period', {
                start: formatDateLabel(overview.subscription.startDate, { locale, fallback: '-' }),
                end: formatDateLabel(overview.subscription.endDate, { locale, fallback: '-' }),
              })}
            </Text>
          </PortalSectionCard>

          <PortalSectionCard
            title={t('playerPortal.home.sections.creditsTitle')}
            subtitle={t('playerPortal.home.sections.creditsSubtitle')}
          >
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('playerPortal.home.credits.total', {
                value: formatAmountLabel(overview.credits.totalCreditRemaining, {
                  locale,
                  fallback: '0',
                }),
              })}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('playerPortal.home.credits.nextExpiry', {
                date: formatDateLabel(overview.credits.nextCreditExpiry, {
                  locale,
                  fallback: t('playerPortal.home.credits.none'),
                }),
              })}
            </Text>
            <View style={[styles.statusInline, { flexDirection: getRowDirection(isRTL) }]}>
              <PortalStatusBadge
                status={overview.performance.currentFreeze?.phase || 'inactive'}
                domain="freezeStatus"
              />
              <Text variant="caption" color={colors.textSecondary}>
                {overview.performance.currentFreeze?.phase
                  ? t('playerPortal.home.credits.currentFreeze', {
                      status: formatFreezeStatusLabel(overview.performance.currentFreeze.phase, {
                        t,
                        locale,
                        fallback: '-',
                      }),
                    })
                  : t('playerPortal.home.credits.noFreeze')}
              </Text>
            </View>
          </PortalSectionCard>

          <PortalSectionCard
            title={t('playerPortal.home.sections.paymentTitle')}
            subtitle={t('playerPortal.home.sections.paymentSubtitle')}
            actionLabel={t('playerPortal.actions.viewAll')}
            onActionPress={() => router.push(ROUTES.PLAYER_PAYMENTS)}
          >
            {overview.latestPayment ? (
              <>
                <View style={[styles.statusInline, { flexDirection: getRowDirection(isRTL) }]}>
                  <PortalStatusBadge status={overview.latestPayment.status} domain="paymentStatus" />
                  <Text variant="caption" color={colors.textSecondary}>
                    {t('playerPortal.home.payment.invoice', {
                      id: overview.latestPayment.invoiceId || '-',
                    })}
                  </Text>
                </View>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {t('playerPortal.home.payment.amount', {
                    amount: formatAmountLabel(overview.latestPayment.amount, {
                      locale,
                      fallback: '0',
                    }),
                  })}
                </Text>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {t('playerPortal.home.payment.dueDate', {
                    date: formatDateLabel(overview.latestPayment.dueDate, {
                      locale,
                      fallback: '-',
                    }),
                  })}
                </Text>
              </>
            ) : (
              <PortalEmptyState
                compact
                title={t('playerPortal.home.payment.emptyTitle')}
                description={t('playerPortal.home.payment.emptyDescription')}
              />
            )}
          </PortalSectionCard>

          <PortalSectionCard
            title={t('playerPortal.home.sections.quickActionsTitle')}
            subtitle={t('playerPortal.home.sections.quickActionsSubtitle')}
          >
            <PortalQuickActions actions={quickActions} />
          </PortalSectionCard>
        </>
      ) : null}

      <PortalSectionCard
        title={t('playerPortal.home.sections.calendarTitle')}
        subtitle={t('playerPortal.home.sections.calendarSubtitle')}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(ROUTES.BOOKING_HOME)}
          style={({ pressed }) => [
            styles.bookingShortcut,
            {
              flexDirection: getRowDirection(isRTL),
              borderColor: colors.border,
              backgroundColor: colors.surfaceSoft,
              opacity: pressed ? 0.84 : 1,
            },
          ]}
        >
          <View style={[styles.shortcutIcon, { backgroundColor: colors.accentOrangeSoft }]}>
            <CalendarClock size={18} color={colors.accentOrange} strokeWidth={2.3} />
          </View>
          <View style={styles.shortcutText}>
            <Text variant="bodySmall" weight="semibold">
              {t('playerPortal.home.calendar.cta')}
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              {t('playerPortal.home.calendar.hint')}
            </Text>
          </View>
        </Pressable>
      </PortalSectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kpiCard: {
    minWidth: '31%',
  },
  statusInline: {
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  bookingShortcut: {
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.sm,
    alignItems: 'center',
    gap: spacing.sm,
  },
  shortcutIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutText: {
    flex: 1,
    gap: 2,
  },
});
