import { StyleSheet, View } from 'react-native';
import { useI18n } from '../../hooks/useI18n';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, spacing } from '../../theme/tokens';
import { Chip } from '../ui/Chip';
import { Surface } from '../ui/Surface';
import { Text } from '../ui/Text';

export function FeaturePlaceholder({
  badge,
  title,
  description,
  icon,
  children,
}) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  return (
    <Surface variant="elevated" style={styles.card} accessibilityRole="summary">
      <View style={[styles.head, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.iconBubble, { backgroundColor: colors.accentOrangeSoft }]}>
          {icon}
        </View>
        {badge ? <Chip label={badge} selected /> : null}
      </View>

      <Text variant="h3" weight="bold" style={styles.title}>
        {title}
      </Text>

      <Text variant="body" color={colors.textSecondary} style={styles.description}>
        {description}
      </Text>

      {children}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    width: '100%',
  },
  head: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBubble: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: spacing.sm,
  },
  description: {
    lineHeight: 24,
  },
});
