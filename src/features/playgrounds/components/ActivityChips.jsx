import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip } from '../../../components/ui/Chip';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';

export function ActivityChips({
  items = [],
  selectedId = '',
  onSelect,
  isLoading = false,
  allLabel = '',
  loadingLabel = '',
  getLabel,
  style,
}) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.content, { flexDirection: getRowDirection(isRTL) }]}
      >
        <Chip
          label={allLabel}
          selected={!selectedId}
          onPress={() => onSelect?.('')}
        />

        {items.map((item) => {
          const id = String(item.id || '');
          const label =
            (typeof getLabel === 'function' && getLabel(item)) ||
            item.nameEn ||
            item.name ||
            id;

          return (
            <Chip
              key={id || label}
              label={label}
              selected={selectedId === id}
              onPress={() => onSelect?.(id)}
            />
          );
        })}
      </ScrollView>

      {isLoading ? (
        <Text variant="caption" color={colors.textMuted}>
          {loadingLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  content: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
});
