import { useMemo } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Text } from '../../../components/ui/Text';
import {
  buildPlayerPaymentInvoiceRoute,
  ROUTES,
} from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../theme/tokens';
import { PortalEmptyState, PortalSectionCard, PortalStatusBadge, PortalSkeletonCard } from '../components';
import { usePlayerPayments } from '../hooks';
import {
  formatAmountLabel,
  formatDateLabel,
  formatPaymentMethodLabel,
  formatPaymentStatusLabel,
  formatPaymentTypeLabel,
} from '../utils/playerPortal.formatters';

const resolveParam = (value) => (Array.isArray(value) ? value[0] : value);

function DetailRow({ label, value }) {
  const { colors } = useTheme();

  return (
    <View style={styles.detailRow}>
      <Text variant="caption" color={colors.textSecondary}>
        {label}
      </Text>
      <Text variant="bodySmall" weight="semibold">
        {value}
      </Text>
    </View>
  );
}

export function PlayerPaymentDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const paymentId = resolveParam(params.paymentId);

  const { overview, error: overviewError, getPaymentById, isLoading, isRefreshing, refetch } = usePlayerPayments();

  const payment = useMemo(() => getPaymentById(paymentId), [getPaymentById, paymentId]);
  const isInitialLoading = (isLoading || (!overview && !overviewError)) && !payment;

  return (
    <AppScreen
      scroll
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => refetch()}
          tintColor={colors.accentOrange}
          colors={[colors.accentOrange]}
        />
      }
    >
      <ScreenHeader
        title={t('playerPortal.payments.detail.title')}
        subtitle={t('playerPortal.payments.detail.subtitle')}
        onBack={() => router.replace(ROUTES.PLAYER_PAYMENTS)}
        right={<LanguageSwitch compact />}
      />

      {isInitialLoading ? (
        <PortalSectionCard>
          <PortalSkeletonCard rows={[20, 14, 14, 14]} />
        </PortalSectionCard>
      ) : null}

      {!isInitialLoading && !payment ? (
        <PortalSectionCard>
          <PortalEmptyState
            title={t('playerPortal.payments.detail.notFoundTitle')}
            description={t('playerPortal.payments.detail.notFoundDescription')}
          />
          <Button fullWidth variant="secondary" onPress={() => router.replace(ROUTES.PLAYER_PAYMENTS)}>
            {t('playerPortal.actions.backHome')}
          </Button>
        </PortalSectionCard>
      ) : null}

      {payment ? (
        <>
          <PortalSectionCard
            title={formatPaymentTypeLabel(payment.type, payment.subType, {
              t,
              locale,
              fallback: t('playerPortal.payments.labels.payment'),
            })}
            subtitle={t('playerPortal.payments.detail.paymentId', { id: payment.id || '-' })}
            right={<PortalStatusBadge status={payment.status} domain="paymentStatus" />}
          >
            <Text variant="h1" weight="bold">
              {formatAmountLabel(payment.amountNumber || payment.amount, {
                locale,
                fallback: '0',
                currency: payment.currency || 'JOD',
              })}
            </Text>
            <DetailRow
              label={t('playerPortal.payments.labels.status')}
              value={formatPaymentStatusLabel(payment.status, {
                t,
                locale,
                fallback: t('playerPortal.payments.labels.notAvailable'),
              })}
            />
            <DetailRow
              label={t('playerPortal.payments.labels.methodShort')}
              value={payment.paymentMethod
                ? formatPaymentMethodLabel(payment.paymentMethod, {
                    t,
                    locale,
                    fallback: payment.paymentMethod,
                  })
                : t('playerPortal.payments.labels.notAvailable')}
            />
            <DetailRow
              label={t('playerPortal.payments.labels.dueDateShort')}
              value={formatDateLabel(payment.dueDate, { locale, fallback: '-' })}
            />
            <DetailRow
              label={t('playerPortal.payments.labels.paidDateShort')}
              value={formatDateLabel(payment.paidOn, {
                locale,
                fallback: t('playerPortal.payments.labels.notPaid'),
              })}
            />
            <DetailRow
              label={t('playerPortal.payments.labels.invoiceRefShort')}
              value={payment.invoiceId || t('playerPortal.payments.labels.notAvailable')}
            />
            {(payment.useCredits || payment.creditsUsed > 0) ? (
              <DetailRow
                label={t('playerPortal.payments.labels.creditsUsed')}
                value={formatAmountLabel(payment.creditsUsed, {
                  locale,
                  fallback: '0',
                  currency: payment.currency || 'JOD',
                })}
              />
            ) : null}
          </PortalSectionCard>

          <PortalSectionCard
            title={t('playerPortal.payments.invoice.title')}
            subtitle={t('playerPortal.payments.invoice.subtitle')}
          >
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('playerPortal.payments.invoice.detailHint')}
            </Text>
            <Button
              fullWidth
              onPress={() => router.push(buildPlayerPaymentInvoiceRoute(payment.id))}
              disabled={!payment.canPrintInvoice}
            >
              {t('playerPortal.payments.actions.openInvoice')}
            </Button>
          </PortalSectionCard>
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  detailRow: {
    gap: spacing.xs,
  },
});
