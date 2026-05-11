import { Pressable, StyleSheet, View } from 'react-native';
import { FileText, ReceiptText } from 'lucide-react-native';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import {
  formatAmountLabel,
  formatDateLabel,
  formatPaymentTypeLabel,
} from '../utils/playerPortal.formatters';
import { PortalStatusBadge } from './PortalStatusBadge';

export function PlayerPaymentCard({ item, locale = 'en', onPress, onInvoicePress }) {
  const { colors } = useTheme();
  const { isRTL, t } = useI18n();
  const dueOrPaidDate = item.paidOn || item.dueDate;
  const amount = formatAmountLabel(item.amountNumber || item.amount, {
    locale,
    fallback: '0',
    currency: item.currency || 'JOD',
  });
  const paymentLabel = formatPaymentTypeLabel(item.type, item.subType, {
    t,
    locale,
    fallback: t('playerPortal.payments.labels.payment'),
  });
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      <View style={[styles.topRow, { flexDirection: getRowDirection(isRTL) }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accentOrangeSoft }]}>
          <ReceiptText size={16} color={colors.accentOrange} strokeWidth={2.2} />
        </View>
        <View style={styles.titleWrap}>
          <Text variant="bodySmall" weight="bold" numberOfLines={1}>
            {paymentLabel}
          </Text>
        </View>
        <PortalStatusBadge status={item.status} domain="paymentStatus" />
      </View>

      <View style={styles.valuesRow}>
        <Text variant="h3" weight="bold">
          {amount}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {item.paidOn
            ? t('playerPortal.payments.labels.paidDate', {
                value: formatDateLabel(dueOrPaidDate, { locale, fallback: '-' }),
              })
            : t('playerPortal.payments.labels.dueDate', {
                value: formatDateLabel(dueOrPaidDate, { locale, fallback: '-' }),
              })}
        </Text>
      </View>

      <View style={[styles.footerRow, { flexDirection: getRowDirection(isRTL) }]}>
        <Text variant="caption" color={colors.textMuted}>
          {t('playerPortal.payments.labels.invoiceRef', {
            value: item.invoiceId || t('playerPortal.payments.labels.notAvailable'),
          })}
        </Text>
        {item.canPrintInvoice ? (
          <Pressable
            accessibilityRole="button"
            onPress={onInvoicePress}
            hitSlop={8}
            style={({ pressed }) => [
              styles.invoiceButton,
              {
                flexDirection: getRowDirection(isRTL),
                backgroundColor: colors.accentOrangeSoft,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <FileText size={14} color={colors.accentOrange} strokeWidth={2.2} />
            <Text variant="caption" weight="semibold" color={colors.accentOrange}>
              {t('playerPortal.payments.actions.invoice')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  valuesRow: {
    gap: spacing.xs,
  },
  footerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  invoiceButton: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    gap: spacing.xs,
  },
});
