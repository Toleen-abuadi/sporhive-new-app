import { StyleSheet, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { resolvePlaygroundsErrorMessage } from '../utils/playgrounds.copy';

const resolveMessage = (error, fallbackMessage) =>
  String(error?.userMessage || error?.message || fallbackMessage || '').trim();

export function PlaygroundsErrorState({
  title,
  error,
  fallbackMessage,
  retryLabel,
  onRetry,
  style,
}) {
  const { colors } = useTheme();
  const { locale } = useI18n();

  const message =
    resolvePlaygroundsErrorMessage(error, locale, resolveMessage(error, fallbackMessage)) ||
    fallbackMessage;

  return (
    <View style={[styles.container, { borderColor: colors.error }, style]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.errorSoft }]}>
        <AlertTriangle size={20} color={colors.error} strokeWidth={2.2} />
      </View>

      <View style={styles.content}>
        <Text variant="body" weight="semibold" color={colors.error}>
          {title}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {message}
        </Text>
      </View>

      {onRetry ? (
        <Button variant="secondary" size="sm" onPress={onRetry}>
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
});
