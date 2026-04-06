import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import { formatDurationMinutes, formatPlaygroundPrice } from '../utils/playgrounds.formatters';

export function DurationSelector({
  durations = [],
  selectedId = '',
  onSelect,
  locale = 'en',
  emptyLabel = '',
  defaultLabel = '',
}) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  if (!durations.length) {
    return emptyLabel ? (
      <Text variant="bodySmall" color={colors.textMuted}>
        {emptyLabel}
      </Text>
    ) : null;
  }

  return (
    <View style={[styles.list, { flexDirection: getRowDirection(isRTL) }]}>
      {durations.map((duration) => {
        const id = String(duration.id || '');
        const selected = id === String(selectedId || '');

        return (
          <Pressable
            key={id}
            onPress={() => onSelect?.(id)}
            style={({ pressed }) => [
              styles.item,
              {
                borderColor: selected ? colors.accentOrange : colors.border,
                backgroundColor: selected ? colors.accentOrangeSoft : colors.surface,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <Text
              variant="bodySmall"
              weight="semibold"
              color={selected ? colors.accentOrange : colors.textPrimary}
            >
              {formatDurationMinutes(duration.minutes, locale)}
            </Text>

            {duration.basePrice != null ? (
              <Text variant="caption" color={colors.textSecondary}>
                {formatPlaygroundPrice(duration.basePrice, { locale })}
              </Text>
            ) : null}

            {duration.isDefault ? (
              <Text variant="caption" color={colors.textMuted}>
                {defaultLabel}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  item: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    minWidth: 94,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 2,
  },
});
