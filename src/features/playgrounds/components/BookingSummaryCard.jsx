import { StyleSheet, View } from 'react-native';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';

function SummaryRow({ label, value, forceLTR = false, valueStyle }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

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

export function BookingSummaryCard({ title, rows = [], style }) {
  return (
    <Surface variant="soft" padding="md" style={[styles.card, style]}>
      {title ? (
        <Text variant="body" weight="bold" style={styles.title}>
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
            />
          ))}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  title: {
    marginBottom: spacing.xs,
  },
  rows: {
    gap: spacing.sm,
  },
  row: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 2,
  },
  ltrValue: {
    writingDirection: 'ltr',
    textAlign: 'left',
  },
});
