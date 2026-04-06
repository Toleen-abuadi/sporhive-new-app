import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { CalendarClock, Compass, Sparkles } from 'lucide-react-native';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { ROUTES } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../services/auth';
import { withAlpha } from '../../../theme/colors';
import { borderRadius, spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import { getAcademyDiscoveryCopy } from '../../academyDiscovery/utils/academyDiscovery.copy';
import { getPlaygroundsCopy } from '../../playgrounds/utils/playgrounds.copy';

function ServiceEntryCard({
  title,
  description,
  ctaLabel,
  icon,
  onPress,
  colors,
  isRTL,
}) {
  return (
    <Surface variant="elevated" padding="md" style={styles.serviceCard}>
      <View style={[styles.serviceHeader, { flexDirection: getRowDirection(isRTL) }]}>
        <View style={[styles.iconBadge, { backgroundColor: colors.accentOrangeSoft }]}>
          {icon}
        </View>
        <View style={styles.serviceTextWrap}>
          <Text variant="body" weight="semibold">
            {title}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            {description}
          </Text>
        </View>
      </View>
      <Button fullWidth variant="secondary" onPress={onPress}>
        {ctaLabel}
      </Button>
    </Surface>
  );
}

export function PublicHomeScreen() {
  const { locale, isRTL } = useI18n();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const academyCopy = getAcademyDiscoveryCopy(locale);
  const playgroundsCopy = getPlaygroundsCopy(locale);

  const copy = useMemo(
    () =>
      locale === 'ar'
        ? {
            headerTitle: 'الرئيسية',
            headerSubtitle: 'ابدأ من هنا واكتشف خدمات سبور هايف',
            heroBadge: 'تجربة عامة ذكية',
            heroWelcome: user?.first_name
              ? `مرحباً ${user.first_name}، جاهز للانطلاق؟`
              : 'مرحباً بك في سبور هايف',
            heroDescription:
              'اكتشف الأكاديميات المناسبة واحجز الملاعب بخطوات بسيطة من شاشة واحدة.',
            servicesTitle: 'الخدمات المتاحة',
            servicesSubtitle: 'اختر الخدمة التي تريد البدء بها الآن.',
            academyDescription:
              'ابحث عن الأكاديميات، قارن التفاصيل، وابدأ طلب الانضمام بسرعة.',
            playgroundDescription:
              'تصفح الملاعب، اختر الموعد المناسب، وأنشئ الحجز مباشرة.',
          }
        : {
            headerTitle: 'Home',
            headerSubtitle: 'Start from here and explore SporHive services',
            heroBadge: 'Smart Public Experience',
            heroWelcome: user?.first_name
              ? `Welcome back ${user.first_name}, ready to play?`
              : 'Welcome to SporHive',
            heroDescription:
              'Discover academies and book playgrounds from one clear, fast starting point.',
            servicesTitle: 'Available Services',
            servicesSubtitle: 'Choose where you want to continue.',
            academyDescription:
              'Search academies, compare details, and start your join request in minutes.',
            playgroundDescription:
              'Browse venues, pick your preferred slot, and confirm bookings smoothly.',
          },
    [locale, user?.first_name]
  );

  const gradientColors = isDark
    ? [withAlpha(colors.accentOrange, 0.2), withAlpha(colors.surfaceElevated, 0.98)]
    : [withAlpha(colors.accentOrangeSoft, 0.8), withAlpha(colors.surface, 0.98)];

  return (
    <AppScreen scroll contentContainerStyle={styles.container}>
      <ScreenHeader
        title={copy.headerTitle}
        subtitle={copy.headerSubtitle}
        right={<LanguageSwitch compact />}
      />

      <Surface variant="elevated" padding="none" style={styles.heroCard}>
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View
            style={[
              styles.heroBadge,
              {
                backgroundColor: withAlpha(colors.accentOrange, isDark ? 0.22 : 0.14),
                borderColor: withAlpha(colors.accentOrange, 0.34),
              },
            ]}
          >
            <Sparkles size={14} color={colors.accentOrange} strokeWidth={2.5} />
            <Text variant="caption" weight="semibold" color={colors.accentOrange}>
              {copy.heroBadge}
            </Text>
          </View>

          <Text variant="h2" weight="bold">
            {copy.heroWelcome}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {copy.heroDescription}
          </Text>

          <View style={[styles.heroActions, { flexDirection: getRowDirection(isRTL) }]}>
            <Button
              size="sm"
              onPress={() => router.push(ROUTES.ACADEMIES_HOME)}
              style={styles.heroActionButton}
            >
              {academyCopy.actions.openAcademies}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => router.push(ROUTES.PLAYGROUNDS_HOME)}
              style={styles.heroActionButton}
            >
              {playgroundsCopy.actions.openBooking}
            </Button>
          </View>
        </LinearGradient>
      </Surface>

      <Surface variant="elevated" padding="md">
        <Text variant="body" weight="semibold">
          {copy.servicesTitle}
        </Text>
        <Text variant="caption" color={colors.textSecondary} style={styles.sectionSubtitle}>
          {copy.servicesSubtitle}
        </Text>
      </Surface>

      <ServiceEntryCard
        title={academyCopy.discovery.title}
        description={copy.academyDescription}
        ctaLabel={academyCopy.actions.openAcademies}
        icon={<Compass size={18} color={colors.accentOrange} strokeWidth={2.35} />}
        onPress={() => router.push(ROUTES.ACADEMIES_HOME)}
        colors={colors}
        isRTL={isRTL}
      />

      <ServiceEntryCard
        title={playgroundsCopy.title}
        description={copy.playgroundDescription}
        ctaLabel={playgroundsCopy.actions.openBooking}
        icon={<CalendarClock size={18} color={colors.accentOrange} strokeWidth={2.35} />}
        onPress={() => router.push(ROUTES.PLAYGROUNDS_HOME)}
        colors={colors}
        isRTL={isRTL}
      />
    </AppScreen>
  );
}

export function PublicHomePlaceholderScreen() {
  return <PublicHomeScreen />;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  heroCard: {
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
  },
  hero: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroActions: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  heroActionButton: {
    flex: 1,
  },
  sectionSubtitle: {
    marginTop: spacing.xs,
  },
  serviceCard: {
    gap: spacing.md,
  },
  serviceHeader: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  serviceTextWrap: {
    flex: 1,
    gap: 2,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
