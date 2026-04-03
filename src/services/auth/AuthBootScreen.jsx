import { AppScreen } from '../../components/ui/AppScreen';
import { Spinner } from '../../components/ui/Spinner';
import { Text } from '../../components/ui/Text';
import { useI18n } from '../../hooks/useI18n';
import { spacing } from '../../theme/tokens';

export function AuthBootScreen() {
  const { t } = useI18n();

  return (
    <AppScreen centered>
      <Spinner size="large" />
      <Text variant="bodySmall" style={{ marginTop: spacing.sm }}>
        {t('common.loading')}
      </Text>
    </AppScreen>
  );
}
