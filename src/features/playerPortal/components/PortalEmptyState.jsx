import { StyleSheet, View } from 'react-native';
import { Inbox } from 'lucide-react-native';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { Text } from '../../../components/ui/Text';
import { getRowDirection } from '../../../utils/rtl';

export function PortalEmptyState({ title, description, icon, compact = false, style }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const Icon = icon || Inbox;

  return (
    <View
      style={[
        styles.container,
        compact && styles.compact,
        { borderColor: colors.border, flexDirection: getRowDirection(isRTL) },
        style,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceSoft }]}>
        <Icon size={compact ? 16 : 20} color={colors.textSecondary} strokeWidth={2.2} />
      </View>
      <View style={styles.textWrap}>
        <Text variant={compact ? 'bodySmall' : 'body'} weight="semibold">
          {title}
        </Text>
        {description ? (
          <Text variant="bodySmall" color={colors.textSecondary}>
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  compact: {
    paddingVertical: spacing.sm,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
});
