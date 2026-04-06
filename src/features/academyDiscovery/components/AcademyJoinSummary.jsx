import { Image, StyleSheet, View } from 'react-native';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import { formatAcademyLocation } from '../utils/academyDiscovery.formatters';
import { isAcademyJoinOpen } from '../utils/academyDiscovery.statuses';

export function AcademyJoinSummary({ academy, copy, style }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  if (!academy) return null;

  const isOpen = isAcademyJoinOpen(academy);
  const location = formatAcademyLocation({
    city: academy.city,
    country: academy.country,
    address: academy.address,
  });

  return (
    <Surface variant="soft" padding="md" style={[styles.container, style]}>
      <View style={[styles.row, { flexDirection: getRowDirection(isRTL) }]}>
        {academy.coverSource || academy.coverUrl ? (
          <Image
            source={{ uri: academy.coverSource || academy.coverUrl }}
            style={styles.cover}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.cover,
              styles.coverFallback,
              { backgroundColor: colors.surfaceElevated },
            ]}
          />
        )}

        <View style={styles.content}>
          <Text variant="body" weight="bold" numberOfLines={1}>
            {academy.name}
          </Text>
          {location ? (
            <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {location}
            </Text>
          ) : null}
          <Text
            variant="caption"
            color={isOpen ? colors.success : colors.warning}
            weight="semibold"
          >
            {isOpen ? copy?.template?.enrollNow : copy?.template?.joinNotAvailable}
          </Text>
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  cover: {
    width: 68,
    height: 68,
    borderRadius: borderRadius.md,
  },
  coverFallback: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  content: {
    flex: 1,
    gap: 2,
  },
});
