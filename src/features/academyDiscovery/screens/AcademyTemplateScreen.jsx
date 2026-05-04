import { useMemo } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { SectionLoader } from '../../../components/ui/Loader';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { buildAcademyJoinRoute } from '../../../constants/routes';
import { spacing } from '../../../theme/tokens';
import {
  AcademyContactCard,
  AcademyCoursesList,
  AcademyGallery,
  AcademyHero,
  AcademyLocationMap,
  AcademySectionCard,
  AcademyTemplateHighlights,
  DiscoveryErrorState,
} from '../components';
import { useAcademyTemplate } from '../hooks';
import {
  buildAcademyMapHref,
  cleanString,
  getAcademyDiscoveryCopy,
  getLocalizedText,
  isAcademyJoinOpen,
} from '../utils';

const resolveParamValue = (value) => (Array.isArray(value) ? value[0] : value);

const normalizeExternalUrl = (value) => {
  const raw = cleanString(value);
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw) || /^mailto:/i.test(raw) || /^tel:/i.test(raw)) {
    return raw;
  }

  return `https://${raw}`;
};

const openExternalUrl = async (value) => {
  const url = normalizeExternalUrl(value);
  if (!url) return;

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) return;
    await Linking.openURL(url);
  } catch {
    // ignore safely
  }
};

export function AcademyTemplateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { locale, t } = useI18n();
  const { colors } = useTheme();
  const copy = getAcademyDiscoveryCopy(locale);
  const contactUsLabel = t('common.contactUs');

  const slug = cleanString(resolveParamValue(params.slug));
  const templateQuery = useAcademyTemplate({
    slug,
    auto: true,
    includeImages: true,
    locale,
  });

  const academy = templateQuery.academy;
  const sections = templateQuery.sections || {};
  const canJoin = isAcademyJoinOpen(academy);
  const mapHref = buildAcademyMapHref(academy);
  const phones = academy?.contactPhones || [];
  const primaryPhone = phones[0] || '';
  const email = academy?.contactEmail || '';
  const website = academy?.website || '';
  const hasDirectContactInfo = Boolean(primaryPhone || email || website);

  const aboutText = academy?.description || '';
  const hasLocationInfo = Boolean(
    mapHref ||
      academy?.address ||
      academy?.city ||
      academy?.country ||
      academy?.lat != null ||
      academy?.lng != null
  );
  const hasContactInfo = Boolean(hasDirectContactInfo || hasLocationInfo);

  const showHero = Boolean(academy && sections.hero !== false);
  const showAbout = Boolean(sections.about || aboutText);
  const showStats = Boolean(sections.stats);
  const showPrograms = Boolean(sections.courses || templateQuery.courses.length);
  const showGallery = Boolean(
    sections.media_gallery || sections.media_ads || templateQuery.gallery.length
  );
  const showSuccessStory = Boolean(
    (sections.success_story || templateQuery.successStory) && templateQuery.successStory
  );
  const showLocation = Boolean((sections.location || hasLocationInfo) && academy);
  const showContact = Boolean((sections.contact_or_join ?? true) && (hasContactInfo || canJoin));

  const contactPrimary = useMemo(() => {
    if (primaryPhone) {
      return {
        label: copy?.actions?.call || copy?.template?.contactAcademy,
        execute: () => openExternalUrl(`tel:${primaryPhone}`),
      };
    }

    if (email) {
      return {
        label: copy?.actions?.email || copy?.template?.contactAcademy,
        execute: () => openExternalUrl(`mailto:${email}`),
      };
    }

    if (website) {
      return {
        label: copy?.actions?.website || copy?.template?.contactAcademy,
        execute: () => openExternalUrl(website),
      };
    }

    return null;
  }, [copy?.actions?.call, copy?.actions?.email, copy?.actions?.website, copy?.template?.contactAcademy, email, primaryPhone, website]);

  const handlePrimaryAction = () => {
    if (!academy?.slug) return;

    if (canJoin) {
      router.push(buildAcademyJoinRoute(academy.slug));
      return;
    }

    contactPrimary?.execute?.();
  };

  return (
    <AppScreen safe>
      <View style={styles.root}>
        <ScreenHeader
          title={academy?.name || copy.discovery.title}
          subtitle={academy?.city || ''}
          onBack={() => router.back()}
          right={<LanguageSwitch compact />}
        />

        {templateQuery.isLoading && !academy ? <SectionLoader minHeight={240} /> : null}

        {!templateQuery.isLoading && templateQuery.error && !academy ? (
          <DiscoveryErrorState
            title={copy.errors.loadTemplate}
            error={templateQuery.error}
            fallbackMessage={copy.errors.loadTemplate}
            retryLabel={copy.actions.retry}
            onRetry={() => templateQuery.refetch()}
          />
        ) : null}

        {academy ? (
          <>
            <ScrollView
              style={styles.scroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={templateQuery.isRefreshing}
                  onRefresh={() => templateQuery.refetch()}
                  colors={[colors.accentOrange]}
                  tintColor={colors.accentOrange}
                />
              }
            >
              {showHero ? <AcademyHero academy={academy} copy={copy} /> : null}

              {showAbout ? (
                <AcademySectionCard title={copy.template.aboutTitle}>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {aboutText || copy.template.aboutEmpty}
                  </Text>
                </AcademySectionCard>
              ) : null}

              {showStats ? (
                <AcademySectionCard
                  title={copy?.template?.statsTitle || 'Highlights'}
                  subtitle={copy?.template?.statsSubtitle || ''}
                >
                  <AcademyTemplateHighlights
                    academy={academy}
                    coursesCount={templateQuery.courses.length}
                    copy={copy}
                  />
                </AcademySectionCard>
              ) : null}

              {showPrograms ? (
                <AcademySectionCard title={copy.template.programsTitle}>
                  <AcademyCoursesList courses={templateQuery.courses} copy={copy} />
                </AcademySectionCard>
              ) : null}

              {showGallery ? (
                <AcademySectionCard title={copy.template.galleryTitle}>
                  <AcademyGallery
                    items={templateQuery.gallery}
                    emptyLabel={copy.template.galleryEmpty}
                  />
                </AcademySectionCard>
              ) : null}

              {showSuccessStory ? (
                <AcademySectionCard title={copy.template.successStoryTitle}>
                  <Text variant="bodySmall" weight="semibold">
                    {getLocalizedText({
                      locale,
                      valueEn: templateQuery.successStory.titleEn,
                      valueAr: templateQuery.successStory.titleAr,
                    })}
                  </Text>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {getLocalizedText({
                      locale,
                      valueEn: templateQuery.successStory.contentEn,
                      valueAr: templateQuery.successStory.contentAr,
                    })}
                  </Text>
                  {templateQuery.successStory.mediaSource ? (
                    <AcademyGallery
                      items={[
                        {
                          id: 'success-story',
                          source: templateQuery.successStory.mediaSource,
                          captionEn: templateQuery.successStory.titleEn,
                          captionAr: templateQuery.successStory.titleAr,
                        },
                      ]}
                      emptyLabel={copy.template.galleryEmpty}
                    />
                  ) : null}
                </AcademySectionCard>
              ) : null}

              {showLocation ? (
                <AcademySectionCard
                  title={copy.template.locationTitle}
                  subtitle={copy?.template?.locationHint || ''}
                >
                  <AcademyLocationMap
                    academy={academy}
                    copy={copy}
                    onOpenMap={(url) => openExternalUrl(url || mapHref)}
                  />

                  {academy?.address || academy?.city || academy?.country ? (
                    <Text variant="bodySmall" color={colors.textSecondary}>
                      {[academy.address, academy.city, academy.country]
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                  ) : null}
                </AcademySectionCard>
              ) : null}

              {showContact ? (
                <AcademySectionCard title={copy.template.contactTitle}>
                  {!canJoin ? (
                    <Text variant="caption" color={colors.textSecondary}>
                      {copy?.template?.joinNotAvailable}
                    </Text>
                  ) : null}
                  <AcademyContactCard academy={academy} copy={copy} />
                </AcademySectionCard>
              ) : null}
            </ScrollView>

            <View
              style={[
                styles.stickyBar,
                {
                  borderTopColor: colors.border,
                  backgroundColor: colors.surfaceElevated,
                },
              ]}
            >
              {canJoin || contactPrimary ? (
                <Button fullWidth onPress={handlePrimaryAction}>
                  {canJoin ? copy.actions.joinNow : contactUsLabel}
                </Button>
              ) : null}

            </View>
          </>
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  stickyBar: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
});
