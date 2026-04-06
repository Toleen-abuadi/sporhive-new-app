import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import { formatPlaygroundTime } from '../utils/playgrounds.formatters';

export function SlotPicker({
  slots = [],
  selectedSlotId = '',
  onSelect,
  locale = 'en',
  emptyLabel = '',
  loading = false,
  loadingLabel = '',
}) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  if (loading) {
    return (
      <Text variant="bodySmall" color={colors.textMuted}>
        {loadingLabel}
      </Text>
    );
  }

  if (!slots.length) {
    return emptyLabel ? (
      <Text variant="bodySmall" color={colors.textMuted}>
        {emptyLabel}
      </Text>
    ) : null;
  }

  return (
    <View style={[styles.grid, { flexDirection: getRowDirection(isRTL) }]}>
      {slots.map((slot) => {
        const id = String(slot.id || `${slot.startTime}-${slot.endTime}`);
        const selected = id === String(selectedSlotId || '');

        return (
          <Pressable
            key={id}
            onPress={() => onSelect?.(slot)}
            style={({ pressed }) => [
              styles.slot,
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
              {formatPlaygroundTime(slot.startTime, locale)}
            </Text>
            <Text variant="caption" color={colors.textMuted}>
              {formatPlaygroundTime(slot.endTime, locale)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slot: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    minWidth: 98,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 2,
  },
});
