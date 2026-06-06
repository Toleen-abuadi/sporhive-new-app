import { StyleSheet, View } from 'react-native';
import { Chip } from '../../../components/ui/Chip';
import { RtlHorizontalScrollView } from '../../../components/ui/RtlHorizontalScrollView';
import { Text } from '../../../components/ui/Text';
import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../theme/tokens';

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

  return (
    <View style={[styles.container, style]}>
      <RtlHorizontalScrollView contentContainerStyle={styles.content}>
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
      </RtlHorizontalScrollView>

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
    paddingHorizontal: spacing.sm,
  },
});
