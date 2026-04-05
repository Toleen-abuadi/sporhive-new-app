import { AppScreen } from '../../components/ui/AppScreen';
import { InlineLoader } from '../../components/ui/Loader';
import { useI18n } from '../../hooks/useI18n';

export function AuthBootScreen() {
  const { t } = useI18n();

  return (
    <AppScreen centered>
      <InlineLoader size="large" label={t('common.loading')} />
    </AppScreen>
  );
}
