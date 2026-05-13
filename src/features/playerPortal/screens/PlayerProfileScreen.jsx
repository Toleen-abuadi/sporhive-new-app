import { Image, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PencilLine } from 'lucide-react-native';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Text } from '../../../components/ui/Text';
import { ROUTES } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { getRowDirection } from '../../../utils/rtl';
import { borderRadius, spacing } from '../../../theme/tokens';
import { PortalEmptyState, PortalErrorState, PortalSectionCard, PortalSkeletonCard } from '../components';
import { usePlayerProfileEditor } from '../hooks';
import { formatDateLabel, formatNumberLabel } from '../utils/playerPortal.formatters';
import { resolvePortalGuardMessage } from '../utils/playerPortal.messages';
import { resolveProfileImageUri } from '../utils/playerPortal.profile';

export function PlayerProfileScreen() {
  const router = useRouter();
  const { t, locale, isRTL } = useI18n();
  const { colors } = useTheme();

  const profileEditor = usePlayerProfileEditor();
  const profile = profileEditor.profile;
  const imageUri = resolveProfileImageUri(profile);

  const showLoading = profileEditor.isFetchingProfile || (!profile && !profileEditor.profileError);

  return (
    <AppScreen
      scroll
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={profileEditor.isFetchingProfile}
          onRefresh={() => profileEditor.fetchProfile()}
          tintColor={colors.accentOrange}
          colors={[colors.accentOrange]}
        />
      }
    >
      <ScreenHeader
        title={t('playerPortal.profile.title')}
        subtitle={t('playerPortal.profile.subtitle')}
        onBack={() => router.replace(ROUTES.PLAYER_HOME)}
        right={<LanguageSwitch compact />}
      />

      {!profileEditor.canFetch ? (
        <PortalSectionCard>
          <PortalEmptyState
            title={t('playerPortal.home.unavailableTitle')}
            description={resolvePortalGuardMessage(profileEditor.guardReason, t)}
          />
        </PortalSectionCard>
      ) : null}

      {profileEditor.canFetch && showLoading ? (
        <PortalSectionCard>
          <PortalSkeletonCard rows={[120, 14, 14, 14]} />
        </PortalSectionCard>
      ) : null}

      {profileEditor.canFetch && !showLoading && profileEditor.profileError && !profile ? (
        <PortalSectionCard>
          <PortalErrorState
            title={t('playerPortal.profile.errors.loadTitle')}
            error={profileEditor.profileError}
            fallbackMessage={t('playerPortal.profile.errors.loadFallback')}
            retryLabel={t('playerPortal.actions.retry')}
            onRetry={() => profileEditor.fetchProfile()}
          />
        </PortalSectionCard>
      ) : null}

      {profileEditor.canFetch && !showLoading && profile ? (
        <>
          <PortalSectionCard
            title={t('playerPortal.profile.sections.summaryTitle')}
            subtitle={t('playerPortal.profile.sections.summarySubtitle')}
          >
            <View style={[styles.headerRow, { flexDirection: getRowDirection(isRTL) }]}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.surfaceSoft }]}> 
                  <Text variant="caption" color={colors.textMuted}>
                    {t('playerPortal.profile.labels.noImage')}
                  </Text>
                </View>
              )}

              <View style={styles.headerInfo}>
                <Text variant="body" weight="bold">
                  {`${profile.first_eng_name || ''} ${profile.last_eng_name || ''}`.trim() ||
                    `${profile.first_ar_name || ''} ${profile.last_ar_name || ''}`.trim() ||
                    t('playerPortal.profile.labels.unnamed')}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {profile.phone1 || '-'}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {formatDateLabel(profile.date_of_birth, { locale, fallback: '-' })}
                </Text>
              </View>
            </View>

            <Button
              fullWidth
              onPress={() => router.push(ROUTES.PLAYER_PROFILE_EDIT)}
              leadingIcon={<PencilLine size={14} color={colors.white} strokeWidth={2.2} />}
            >
              {t('playerPortal.profile.actions.editProfile')}
            </Button>
          </PortalSectionCard>

          <PortalSectionCard
            title={t('playerPortal.profile.sections.namesTitle')}
            subtitle={t('playerPortal.profile.sections.namesSubtitle')}
          >
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('playerPortal.profile.labels.firstEnglish', { value: profile.first_eng_name || '-' })}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('playerPortal.profile.labels.middleEnglish', { value: profile.middle_eng_name || '-' })}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('playerPortal.profile.labels.lastEnglish', { value: profile.last_eng_name || '-' })}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('playerPortal.profile.labels.firstArabic', { value: profile.first_ar_name || '-' })}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('playerPortal.profile.labels.middleArabic', { value: profile.middle_ar_name || '-' })}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('playerPortal.profile.labels.lastArabic', { value: profile.last_ar_name || '-' })}
            </Text>
          </PortalSectionCard>

          <PortalSectionCard
            title={t('playerPortal.profile.sections.contactTitle')}
            subtitle={t('playerPortal.profile.sections.contactSubtitle')}
          >
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('playerPortal.profile.labels.phone1', { value: profile.phone1 || '-' })}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('playerPortal.profile.labels.phone2', { value: profile.phone2 || '-' })}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('playerPortal.profile.labels.dateOfBirth', {
                value: formatDateLabel(profile.date_of_birth, { locale, fallback: '–' }),
              })}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('playerPortal.profile.labels.address', { value: profile.address || '-' })}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('playerPortal.profile.labels.location', { value: profile.google_maps_location || '-' })}
            </Text>
          </PortalSectionCard>

          <PortalSectionCard
            title={t('playerPortal.profile.sections.healthTitle')}
            subtitle={t('playerPortal.profile.sections.healthSubtitle')}
          >
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('playerPortal.profile.labels.weight', {
                value: formatNumberLabel(profile.weight, { locale, fallback: '-' }),
              })}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('playerPortal.profile.labels.height', {
                value: formatNumberLabel(profile.height, { locale, fallback: '-' }),
              })}
            </Text>
          </PortalSectionCard>
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  headerRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
});
