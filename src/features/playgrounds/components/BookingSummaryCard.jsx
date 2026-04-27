import { createElement, isValidElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, shadow, spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';

const resolveIconNode = (icon, { color, size = 20 } = {}) => {
  if (!icon) return null;
  if (isValidElement(icon)) {
    return icon;
  }
  if (
    typeof icon === 'function' ||
    (typeof icon === 'object' && icon != null && '$$typeof' in icon)
  ) {
    return createElement(icon, { size, color, strokeWidth: 2 });
  }
  return icon;
};

function SummaryRow({
  label,
  value,
  forceLTR = false,
  valueStyle,
  icon,
  variant = 'default',
}) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const iconNode = resolveIconNode(icon, {
    color: colors.textMuted,
    size: variant === 'review' ? 18 : 18,
  });

  if (variant === 'review') {
    return (
      <View style={[styles.reviewRow, { flexDirection: getRowDirection(isRTL) }]}>
        <View
          style={[
            styles.reviewLabelWrap,
            { flexDirection: getRowDirection(isRTL) },
          ]}
        >
          {iconNode ? <View style={styles.iconWrap}>{iconNode}</View> : null}
          <Text variant="bodySmall" weight="regular" color={colors.textPrimary}>
            {label}
          </Text>
        </View>

        <Text
          variant="body"
          weight="regular"
          color={colors.textPrimary}
          style={[forceLTR ? styles.ltrValue : null, styles.reviewValue, valueStyle]}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.row, { flexDirection: getRowDirection(isRTL) }]}>
      <Text variant="caption" color={colors.textMuted}>
        {label}
      </Text>
      <Text
        variant="bodySmall"
        weight="semibold"
        color={colors.textPrimary}
        style={[forceLTR ? styles.ltrValue : null, valueStyle]}
      >
        {value}
      </Text>
    </View>
  );
}

export function BookingSummaryCard({
  title,
  rows = [],
  style,
  variant = 'default',
}) {
  const isReviewVariant = variant === 'review';

  return (
    <Surface
      variant={isReviewVariant ? 'elevated' : 'soft'}
      padding={isReviewVariant ? 'lg' : 'md'}
      style={[
        styles.card,
        isReviewVariant ? styles.reviewCard : null,
        style,
      ]}
    >
      {title ? (
        <Text
          variant={isReviewVariant ? 'body' : 'body'}
          weight={isReviewVariant ? 'semibold' : 'bold'}
          style={[styles.title, isReviewVariant ? styles.reviewTitle : null]}
        >
          {title}
        </Text>
      ) : null}

      <View style={styles.rows}>
        {rows
          .filter((row) => row && row.value != null && row.value !== '')
          .map((row, index) => (
            <SummaryRow
              key={`${row.label || 'row'}_${index}`}
              label={row.label}
              value={row.value}
              forceLTR={Boolean(row.forceLTR)}
              valueStyle={row.valueStyle}
              icon={row.icon}
              variant={variant}
            />
          ))}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
  },
  reviewCard: {
    borderRadius: borderRadius.xl,
    ...shadow.lg,
  },
  title: {
    marginBottom: spacing.xs,
  },
  reviewTitle: {
    marginBottom: spacing.xs,
  },
  rows: {
    gap: spacing.xxs,
  },
  row: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 2,
  },
  ltrValue: {
    writingDirection: 'ltr',
    textAlign: 'auto',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 34,
  },
  reviewLabelWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  reviewValue: {
    flexShrink: 1,
  },
});
