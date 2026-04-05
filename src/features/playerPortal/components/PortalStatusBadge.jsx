import { StyleSheet, View } from 'react-native';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { formatStatusLabel } from '../utils/playerPortal.formatters';
import { Text } from '../../../components/ui/Text';
import { normalizeApiEnumValue } from '../../../utils/apiValueLocalization';

const STATUS_VARIANTS = Object.freeze({
  active: { background: 'success', text: 'white' },
  approved: { background: 'success', text: 'white' },
  paid: { background: 'success', text: 'white' },
  completed: { background: 'success', text: 'white' },
  valid: { background: 'success', text: 'white' },
  ready: { background: 'success', text: 'white' },
  printed: { background: 'info', text: 'white' },
  collected: { background: 'success', text: 'white' },
  received: { background: 'info', text: 'white' },
  received_and_player_notified: { background: 'info', text: 'white' },
  refunded: { background: 'info', text: 'white' },
  upcoming: { background: 'info', text: 'white' },
  scheduled: { background: 'info', text: 'white' },
  pending: { background: 'warning', text: 'white' },
  pending_payment: { background: 'warning', text: 'white' },
  processing: { background: 'warning', text: 'white' },
  under_review: { background: 'warning', text: 'white' },
  due: { background: 'warning', text: 'white' },
  partial: { background: 'warning', text: 'white' },
  overdue: { background: 'warning', text: 'white' },
  unpaid: { background: 'warning', text: 'white' },
  inactive: { background: 'textMuted', text: 'white' },
  ended: { background: 'textMuted', text: 'white' },
  expired: { background: 'textMuted', text: 'white' },
  cancelled: { background: 'textMuted', text: 'white' },
  rejected: { background: 'error', text: 'white' },
  failed: { background: 'error', text: 'white' },
});

const resolveVariant = (status) => {
  const normalized = normalizeApiEnumValue(status);
  if (!normalized) return STATUS_VARIANTS.inactive;
  return STATUS_VARIANTS[normalized] || STATUS_VARIANTS.inactive;
};

export function PortalStatusBadge({ status, label, style, domain = 'status' }) {
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const variant = resolveVariant(status || label);
  const resolvedLabel =
    label ||
    formatStatusLabel(status, {
      t,
      locale,
      domain,
      fallback: '-',
    });

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors[variant.background] || colors.surfaceSoft,
        },
        style,
      ]}
    >
      <Text variant="caption" weight="semibold" color={colors[variant.text] || colors.textPrimary}>
        {resolvedLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
