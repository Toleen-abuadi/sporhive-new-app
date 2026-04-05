import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { CalendarDays, CreditCard, MapPin, Users } from 'lucide-react-native';

import { useTheme } from '../../../hooks/useTheme';
import { useI18n } from '../../../hooks/useI18n';
import { AppScreen } from '../../../components/ui/AppScreen';
import { OverlayLoader } from '../../../components/ui/Loader';
import { Text } from '../../../components/ui/Text';
import { Chip } from '../../../components/ui/Chip';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ThemeModeToggle } from '../../../components/ui/ThemeModeSwitch';
import { useToast } from '../../../components/feedback/ToastHost';
import { buildAuthLoginRoute } from '../../../constants/routes';
import { ENTRY_MODE_VALUES } from '../../../constants/entryModes';
import {
  useAuth,
} from '../../../services/auth';
import { withAlpha } from '../../../theme/colors';
import { borderRadius, shadow, spacing } from '../../../theme/tokens';

const logoSource = require('../../../../assets/images/logo.png');

function DecisionCard({
  title,
  description,
  chipLabel,
  IconPrimary,
  IconSecondary,
  colors,
  isRTL,
  onPress,
  accessibilityLabel,
  disabled,
  mountProgress,
}) {
  const scale = useSharedValue(1);
  const sweep = useSharedValue(0);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: mountProgress.value,
    transform: [
      { translateY: interpolate(mountProgress.value, [0, 1], [20, 0]) },
      { scale: scale.value },
    ],
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    opacity: sweep.value * 0.25,
    transform: [
      {
        translateX: interpolate(
          sweep.value,
          [0, 1],
          isRTL ? [280, -280] : [-280, 280]
        ),
      },
    ],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withTiming(0.985, { duration: 110 });
    sweep.value = 0;
    sweep.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 140 });
  };

  return (
    <Animated.View style={animatedCardStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: disabled ? 0.75 : pressed ? 0.95 : 1,
          },
        ]}
        android_ripple={{ color: colors.accentOrangeSoft }}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.cardSweep,
            { backgroundColor: colors.accentOrange },
            sweepStyle,
          ]}
        />

        <View style={[styles.cardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View
            style={[
              styles.iconBubble,
              {
                backgroundColor: colors.accentOrangeSoft,
                borderColor: colors.border,
              },
            ]}
          >
            <IconPrimary size={20} color={colors.accentOrange} strokeWidth={2.3} />
          </View>

          <View
            style={[
              styles.iconBubbleSecondary,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                marginLeft: isRTL ? 0 : -10,
                marginRight: isRTL ? -10 : 0,
              },
            ]}
          >
            <IconSecondary size={18} color={colors.textSecondary} strokeWidth={2.2} />
          </View>

          <Chip
            selected
            label={chipLabel}
            style={{
              marginLeft: isRTL ? 0 : 'auto',
              marginRight: isRTL ? 'auto' : 0,
            }}
          />
        </View>

        <View style={styles.cardBody}>
          <Text variant="h3" weight="bold">
            {title}
          </Text>
          <Text variant="body" color={colors.textSecondary} style={styles.cardDescription}>
            {description}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function EntryDecisionScreen() {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const { setEntryMode, setWelcomeSeen } = useAuth();
  const isMountedRef = useRef(true);

  const [submittingMode, setSubmittingMode] = useState(null);

  const titleProgress = useSharedValue(0);
  const cardOneProgress = useSharedValue(0);
  const cardTwoProgress = useSharedValue(0);
  const footerProgress = useSharedValue(0);
  const glowPulse = useSharedValue(0);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );

  useEffect(() => {
    titleProgress.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    cardOneProgress.value = withDelay(80, withTiming(1, { duration: 390, easing: Easing.out(Easing.cubic) }));
    cardTwoProgress.value = withDelay(160, withTiming(1, { duration: 390, easing: Easing.out(Easing.cubic) }));
    footerProgress.value = withDelay(240, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));

    glowPulse.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [cardOneProgress, cardTwoProgress, footerProgress, glowPulse, titleProgress]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleProgress.value,
    transform: [{ translateY: interpolate(titleProgress.value, [0, 1], [18, 0]) }],
  }));

  const footerStyle = useAnimatedStyle(() => ({
    opacity: footerProgress.value,
    transform: [{ translateY: interpolate(footerProgress.value, [0, 1], [14, 0]) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + glowPulse.value * 0.2,
    transform: [
      { translateY: interpolate(glowPulse.value, [0, 1], [0, -12]) },
      { scale: 1 + glowPulse.value * 0.06 },
    ],
  }));

  const navigateAfterModeSelect = useCallback((mode) => {
    if (mode === ENTRY_MODE_VALUES.PLAYER) {
      router.replace(buildAuthLoginRoute(ENTRY_MODE_VALUES.PLAYER, true));
      return;
    }

    router.replace(buildAuthLoginRoute(ENTRY_MODE_VALUES.PUBLIC, true));
  }, [router]);

  const chooseMode = useCallback(
    async (mode) => {
      if (submittingMode) return;
      setSubmittingMode(mode);

      try {
        await Promise.all([setEntryMode(mode), setWelcomeSeen(true)]);
        navigateAfterModeSelect(mode);
      } catch (error) {
        if (__DEV__) {
          console.warn('[entry] failed to persist mode selection', {
            mode,
            error: String(error?.message || error),
          });
        }
        toast.error(t('errors.couldNotSaveChoice'));
      } finally {
        if (isMountedRef.current) {
          setSubmittingMode(null);
        }
      }
    },
    [navigateAfterModeSelect, setEntryMode, setWelcomeSeen, submittingMode, t, toast]
  );

  const backgroundColors = useMemo(
    () =>
      isDark
        ? [colors.background, colors.surfaceElevated, colors.background]
        : [colors.surface, colors.background, colors.surface],
    [colors.background, colors.surface, colors.surfaceElevated, isDark]
  );

  return (
    <AppScreen
      scroll
      safe
      paddingHorizontal={0}
      paddingTop={0}
      paddingBottom={0}
      contentContainerStyle={styles.screenContainer}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={backgroundColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.bgLayer} pointerEvents="none">
          <Animated.View
            style={[
              styles.glow,
              {
                backgroundColor: withAlpha(colors.accentOrange, 0.22),
                right: isRTL ? undefined : -80,
                left: isRTL ? -80 : undefined,
              },
              glowStyle,
            ]}
          />
          <View
            style={[
              styles.ring,
              styles.ringLarge,
              {
                borderColor: withAlpha(colors.border, 0.35),
                right: isRTL ? undefined : -140,
                left: isRTL ? -140 : undefined,
              },
            ]}
          />
          <View
            style={[
              styles.ring,
              styles.ringSmall,
              {
                borderColor: withAlpha(colors.border, 0.26),
                left: isRTL ? undefined : -80,
                right: isRTL ? -80 : undefined,
              },
            ]}
          />
        </View>

        <View style={styles.topBar}>
          <View
            style={[
              styles.switches,
              {
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignSelf: isRTL ? 'flex-start' : 'flex-end',
              },
            ]}
          >
            <ThemeModeToggle compact />
            <LanguageSwitch compact />
          </View>
        </View>

        <Animated.View style={[styles.hero, titleStyle]}>
          <View style={[styles.logoWrap, { backgroundColor: withAlpha(colors.accentOrange, 0.12) }]}>
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          </View>

          <Text variant="h2" weight="bold" align="center" style={styles.brandText}>
            SporHive
          </Text>

          <Text variant="body" color={colors.textSecondary} align="center" style={styles.tagline}>
            {t('entry.tagline')}
          </Text>

          <Text variant="display" weight="bold" align="center" style={styles.title}>
            {t('entry.title')}
          </Text>
        </Animated.View>

        <View style={styles.cards}>
          <DecisionCard
            title={t('entry.public.title')}
            description={t('entry.public.desc')}
            chipLabel={t('entry.public.chip')}
            IconPrimary={MapPin}
            IconSecondary={CalendarDays}
            colors={colors}
            isRTL={isRTL}
            mountProgress={cardOneProgress}
            disabled={Boolean(submittingMode)}
            onPress={() => chooseMode(ENTRY_MODE_VALUES.PUBLIC)}
            accessibilityLabel={t('entry.public.title')}
          />

          <DecisionCard
            title={t('entry.player.title')}
            description={t('entry.player.desc')}
            chipLabel={t('entry.player.chip')}
            IconPrimary={Users}
            IconSecondary={CreditCard}
            colors={colors}
            isRTL={isRTL}
            mountProgress={cardTwoProgress}
            disabled={Boolean(submittingMode)}
            onPress={() => chooseMode(ENTRY_MODE_VALUES.PLAYER)}
            accessibilityLabel={t('entry.player.title')}
          />
        </View>

        <Animated.View style={[styles.footer, footerStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('entry.notSure')}
            onPress={() => chooseMode(ENTRY_MODE_VALUES.PUBLIC)}
            disabled={Boolean(submittingMode)}
            accessibilityState={{ disabled: Boolean(submittingMode), busy: Boolean(submittingMode) }}
            style={({ pressed }) => [
              styles.notSure,
              {
                borderColor: colors.border,
                backgroundColor: pressed ? colors.surfaceElevated : colors.surface,
                opacity: submittingMode ? 0.7 : 1,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
            android_ripple={{ color: colors.accentOrangeSoft }}
          >
            <MapPin size={16} color={colors.accentOrange} strokeWidth={2.4} />
            <Text variant="bodySmall" weight="semibold" color={colors.textPrimary}>
              {t('entry.notSure')}
            </Text>
          </Pressable>

          <Text variant="caption" color={colors.textMuted} align="center" style={styles.footerHint}>
            {t('entry.footerHint')}
          </Text>
        </Animated.View>

        <OverlayLoader visible={Boolean(submittingMode)} label={t('common.loading')} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    minHeight: 720,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  glow: {
    position: 'absolute',
    top: -40,
    width: 260,
    height: 260,
    borderRadius: 999,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 999,
  },
  ringLarge: {
    top: 40,
    width: 360,
    height: 360,
  },
  ringSmall: {
    bottom: 140,
    width: 220,
    height: 220,
  },
  topBar: {
    marginTop: spacing.md,
  },
  switches: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  hero: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  logoWrap: {
    width: 84,
    height: 84,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logo: {
    width: 52,
    height: 52,
  },
  brandText: {
    textAlign: 'center',
  },
  tagline: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  title: {
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  cards: {
    marginTop: spacing['2xl'],
    gap: spacing.md,
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    minHeight: 160,
    overflow: 'hidden',
    ...shadow.md,
  },
  cardSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 72,
  },
  cardTop: {
    alignItems: 'center',
    minHeight: 34,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconBubbleSecondary: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 12,
  },
  cardBody: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  cardDescription: {
    lineHeight: 22,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  notSure: {
    minHeight: 46,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  footerHint: {
    textAlign: 'center',
    opacity: 0.9,
  },
});

