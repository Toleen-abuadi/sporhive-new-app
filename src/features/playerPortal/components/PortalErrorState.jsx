import { StyleSheet, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Text } from '../../../components/ui/Text';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';

const resolveMessage = (error, fallbackMessage) =>
  String(error?.userMessage || error?.message || fallbackMessage || '').trim() ||
  'Something went wrong.';

export function PortalErrorState({
  title,
  error,
  fallbackMessage,
  retryLabel,
  onRetry,
  compact = false,
  style,
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, compact && styles.compact, { borderColor: colors.error }, style]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.accentOrangeSoft }]}>
        <AlertTriangle size={compact ? 16 : 20} color={colors.error} strokeWidth={2.2} />
      </View>
      <View style={styles.content}>
        <Text variant={compact ? 'bodySmall' : 'body'} weight="semibold" color={colors.error}>
          {title}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {resolveMessage(error, fallbackMessage)}
        </Text>
      </View>
      {onRetry ? (
        <Button size="sm" variant="secondary" onPress={onRetry} style={styles.retryButton}>
          {retryLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'flex-start',
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
  content: {
    width: '100%',
    gap: spacing.xs,
  },
  retryButton: {
    marginTop: spacing.xs,
  },
});

