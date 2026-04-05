import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Text } from '../../../components/ui/Text';
import { ROUTES } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../theme/tokens';
import { PortalSectionCard } from '../components';

export function PlayerSectionPlaceholderScreen({ sectionKey }) {
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();

  const title = t(`playerPortal.routes.${sectionKey}.title`);
  const description = t(`playerPortal.routes.${sectionKey}.description`);

  return (
    <AppScreen scroll contentContainerStyle={styles.container}>
      <ScreenHeader title={title} subtitle={t('playerPortal.routes.subtitle')} right={<LanguageSwitch compact />} />

      <PortalSectionCard title={title} subtitle={t('common.comingSoon')}>
        <Text variant="body" color={colors.textSecondary}>
          {description}
        </Text>
      </PortalSectionCard>

      <View style={styles.actions}>
        <Button fullWidth variant="secondary" onPress={() => router.replace(ROUTES.PLAYER_HOME)}>
          {t('playerPortal.actions.backHome')}
        </Button>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  actions: {
    marginTop: spacing.xs,
    width: '100%',
  },
});

