import { useEffect, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { Text } from '../../../components/ui/Text';
import { ThemeModeToggle } from '../../../components/ui/ThemeModeSwitch';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../services/auth';
import { ROUTES } from '../../../constants/routes';
import { withAlpha } from '../../../theme/colors';
import { borderRadius, shadow, spacing } from '../../../theme/tokens';

const logoSource = require('../../../../assets/images/logo.png');

function getFloatingPosition(item, isRTL) {
  const style = {};
  if (typeof item.top === 'number') style.top = item.top;
  if (typeof item.bottom === 'number') style.bottom = item.bottom;
  if (typeof item.start === 'number') style[isRTL ? 'right' : 'left'] = item.start;
  if (typeof item.end === 'number') style[isRTL ? 'left' : 'right'] = item.end;
  return style;
}

const FloatingIcon = ({ icon, color, style, delay = 0 }) => {
  const float = useSharedValue(0);
  const fade = useSharedValue(0);

  useEffect(() => {
    fade.value = withDelay(delay, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    float.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [delay, fade, float]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: float.value * -7 }],
  }));

  return (
    <Animated.View style={[styles.iconChip, animatedStyle, style]}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
    </Animated.View>
  );
};

export function WelcomeScreen() {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const { setWelcomeSeen } = useAuth();

  const cardScale = useSharedValue(0.95);
  const cardOpacity = useSharedValue(0);
  const buttonOffset = useSharedValue(12);
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    cardScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    cardOpacity.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
    buttonOffset.value = withDelay(220, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
    buttonOpacity.value = withDelay(220, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, [buttonOffset, buttonOpacity, cardOpacity, cardScale]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonOffset.value }],
  }));

  const iconData = useMemo(
    () => [
      { key: 'soccer', icon: 'soccer', delay: 120, top: -8, start: -10 },
      { key: 'volleyball', icon: 'volleyball', delay: 200, top: -14, end: -8 },
      { key: 'tennis', icon: 'tennis', delay: 280, top: 124, start: -20 },
      { key: 'basketball', icon: 'basketball', delay: 340, top: 126, end: -18 },
      { key: 'badminton', icon: 'badminton', delay: 420, bottom: -12, end: 8 },
    ],
    []
  );

  const handleExplore = async () => {
    try {
      await setWelcomeSeen(true);
    } catch (error) {
      if (__DEV__) {
        console.warn('[welcome] failed to persist welcome flag', error);
      }
    }

    router.replace(ROUTES.ONBOARDING_ENTRY);
  };

  return (
    <AppScreen safe paddingHorizontal={0} paddingTop={0} paddingBottom={0}>
      <View style={styles.container}>
        <LinearGradient
          colors={isDark ? [colors.background, colors.surface] : [colors.surface, colors.background]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.pattern} pointerEvents="none">
          <View
            style={[
              styles.ring,
              styles.ringLarge,
              {
                borderColor: withAlpha(colors.border, 0.31),
                right: isRTL ? undefined : -140,
                left: isRTL ? -140 : undefined,
              },
            ]}
          />
          <View
            style={[
              styles.ring,
              styles.ringMedium,
              {
                borderColor: withAlpha(colors.border, 0.27),
                left: isRTL ? undefined : -160,
                right: isRTL ? -160 : undefined,
              },
            ]}
          />
          <View
            style={[
              styles.ring,
              styles.ringSmall,
              {
                borderColor: withAlpha(colors.border, 0.24),
                right: isRTL ? undefined : -100,
                left: isRTL ? -100 : undefined,
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

        <View style={styles.content}>
          <View style={styles.hero}>
            <Image
              source={logoSource}
              resizeMode="contain"
              style={[styles.watermark, { tintColor: withAlpha(colors.textMuted, 0.14) }]}
              accessibilityLabel={t('welcome.logoLabel')}
            />

            <Animated.View
              style={[
                styles.logoCard,
                cardStyle,
                {
                  backgroundColor: withAlpha(isDark ? colors.surfaceElevated : colors.white, 0.9),
                  borderColor: withAlpha(colors.border, 0.52),
                  shadowColor: colors.black,
                },
              ]}
            >
              <Image
                source={logoSource}
                resizeMode="contain"
                style={styles.logo}
                accessibilityLabel={t('welcome.logoLabel')}
              />
            </Animated.View>

            {iconData.map((item) => (
              <FloatingIcon
                key={item.key}
                icon={item.icon}
                color={colors.textSecondary}
                delay={item.delay}
                style={[
                  getFloatingPosition(item, isRTL),
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : colors.white,
                    borderColor: colors.border,
                    shadowColor: colors.black,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.textBlock}>
            <Text variant="h2" weight="bold" align="center" style={styles.title}>
              {t('welcome.title')}
            </Text>
            <Text variant="bodyLarge" color={colors.textSecondary} align="center" style={styles.subtitle}>
              {t('welcome.subtitle')}
            </Text>
          </View>
        </View>

        <Animated.View style={[styles.footer, buttonStyle]}>
          <Button
            size="lg"
            onPress={handleExplore}
            fullWidth
            accessibilityLabel={t('welcome.cta')}
            style={styles.ctaButton}
          >
            {t('welcome.cta')}
          </Button>
          <Text variant="bodySmall" color={colors.textMuted} align="center" style={styles.hint}>
            {t('welcome.hint')}
          </Text>
        </Animated.View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  pattern: {
    ...StyleSheet.absoluteFillObject,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 999,
  },
  ringLarge: {
    width: 420,
    height: 420,
    top: -84,
  },
  ringMedium: {
    width: 300,
    height: 300,
    top: 84,
  },
  ringSmall: {
    width: 220,
    height: 220,
    bottom: 70,
  },
  topBar: {
    paddingTop: spacing.lg,
  },
  switches: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  watermark: {
    position: 'absolute',
    width: 220,
    height: 220,
    opacity: 0.08,
  },
  logoCard: {
    width: 230,
    height: 230,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...shadow.lg,
  },
  logo: {
    width: 152,
    height: 152,
  },
  iconChip: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...shadow.sm,
  },
  textBlock: {
    marginTop: spacing['2xl'],
    alignItems: 'center',
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    maxWidth: 320,
    lineHeight: 26,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
  ctaButton: {
    width: '100%',
    borderRadius: borderRadius.pill,
  },
  hint: {
    marginTop: spacing.md,
  },
});
