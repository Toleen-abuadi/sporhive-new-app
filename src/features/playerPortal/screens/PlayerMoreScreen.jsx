import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  CalendarClock,
  ChevronRight,
  Gauge,
  HandCoins,
  LogOut,
  Newspaper,
  ShieldPlus,
  ShoppingCart,
  UserRoundCog,
} from 'lucide-react-native';
import { useToast } from '../../../components/feedback/ToastHost';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Text } from '../../../components/ui/Text';
import { ThemeModeSwitch } from '../../../components/ui/ThemeModeSwitch';
import { ROUTES, buildAuthLoginRoute } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import {
  AUTH_LOGIN_MODES,
  useAuth,
} from '../../../services/auth';
import { getRowDirection } from '../../../utils/rtl';
import { borderRadius, spacing } from '../../../theme/tokens';
import { PortalSectionCard } from '../components';

function MoreRow({ item, isRTL, colors }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={item.onPress}
      style={({ pressed }) => [
        styles.row,
        {
          flexDirection: getRowDirection(isRTL),
          borderColor: colors.border,
          backgroundColor: colors.surfaceSoft,
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.accentOrangeSoft }]}>
        {item.icon}
      </View>
      <View style={styles.rowBody}>
        <Text variant="bodySmall" weight="semibold">
          {item.label}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {item.description}
        </Text>
      </View>
      <ChevronRight
        size={16}
        color={colors.textMuted}
        strokeWidth={2.4}
        style={isRTL ? styles.mirrorIcon : null}
      />
    </Pressable>
  );
}

export function PlayerMoreScreen() {
  const router = useRouter();
  const { t, isRTL } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const result = await logout();
      if (!result?.success) {
        toast.error(t('auth.errors.generic'));
        return;
      }
      router.replace(buildAuthLoginRoute(AUTH_LOGIN_MODES.PLAYER, true));
    } catch (error) {
      if (__DEV__) {
        console.warn('[player-more] logout failed', error);
      }
      toast.error(t('auth.errors.generic'));
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, logout, router, t, toast]);

  const groups = useMemo(
    () => [
      {
        key: 'portal',
        title: t('playerPortal.navigation.more.sections.portalTitle'),
        subtitle: t('playerPortal.navigation.more.sections.portalSubtitle'),
        items: [
          {
            key: 'profile',
            label: t('playerPortal.actions.profile'),
            description: t('playerPortal.navigation.more.descriptions.profile'),
            icon: <UserRoundCog size={16} color={colors.accentOrange} strokeWidth={2.3} />,
            onPress: () => router.push(ROUTES.PLAYER_PROFILE),
          },
          {
            key: 'renewal',
            label: t('playerPortal.actions.renewal'),
            description: t('playerPortal.navigation.more.descriptions.renewal'),
            icon: <ShieldPlus size={16} color={colors.accentOrange} strokeWidth={2.3} />,
            onPress: () => router.push(ROUTES.PLAYER_RENEWAL),
          },
          {
            key: 'freeze',
            label: t('playerPortal.actions.freeze'),
            description: t('playerPortal.navigation.more.descriptions.freeze'),
            icon: <HandCoins size={16} color={colors.accentOrange} strokeWidth={2.3} />,
            onPress: () => router.push(ROUTES.PLAYER_FREEZE),
          },
        ],
      },
      {
        key: 'insights',
        title: t('playerPortal.navigation.more.sections.insightsTitle'),
        subtitle: t('playerPortal.navigation.more.sections.insightsSubtitle'),
        items: [
          {
            key: 'performance',
            label: t('playerPortal.actions.performance'),
            description: t('playerPortal.navigation.more.descriptions.performance'),
            icon: <Gauge size={16} color={colors.accentOrange} strokeWidth={2.3} />,
            onPress: () => router.push(ROUTES.PLAYER_PERFORMANCE),
          },
          {
            key: 'news',
            label: t('playerPortal.actions.news'),
            description: t('playerPortal.navigation.more.descriptions.news'),
            icon: <Newspaper size={16} color={colors.accentOrange} strokeWidth={2.3} />,
            onPress: () => router.push(ROUTES.PLAYER_NEWS),
          },
        ],
      },
      {
        key: 'services',
        title: t('playerPortal.navigation.more.sections.servicesTitle'),
        subtitle: t('playerPortal.navigation.more.sections.servicesSubtitle'),
        items: [
          {
            key: 'orders',
            label: t('playerPortal.store.actions.myOrders'),
            description: t('playerPortal.navigation.more.descriptions.orders'),
            icon: <ShoppingCart size={16} color={colors.accentOrange} strokeWidth={2.3} />,
            onPress: () => router.push(ROUTES.PLAYER_STORE_ORDERS),
          },
          {
            key: 'booking',
            label: t('playerPortal.actions.booking'),
            description: t('playerPortal.navigation.more.descriptions.booking'),
            icon: <CalendarClock size={16} color={colors.accentOrange} strokeWidth={2.3} />,
            onPress: () => router.push(ROUTES.BOOKING_HOME),
          },
        ],
      },
    ],
    [colors.accentOrange, router, t]
  );

  return (
    <AppScreen scroll contentContainerStyle={styles.container}>
      <ScreenHeader
        title={t('playerPortal.navigation.more.title')}
        subtitle={t('playerPortal.navigation.more.subtitle')}
        right={<LanguageSwitch compact />}
      />

      {groups.map((group) => (
        <PortalSectionCard key={group.key} title={group.title} subtitle={group.subtitle}>
          <View style={styles.groupRows}>
            {group.items.map((item) => (
              <MoreRow key={item.key} item={item} isRTL={isRTL} colors={colors} />
            ))}
          </View>
        </PortalSectionCard>
      ))}

      <PortalSectionCard
        title={t('common.theme.title')}
        subtitle={t('common.theme.subtitle')}
      >
        <ThemeModeSwitch />
      </PortalSectionCard>

      <PortalSectionCard>
        <Button
          fullWidth
          variant="secondary"
          loading={isLoggingOut}
          onPress={handleLogout}
          leadingIcon={<LogOut size={16} color={colors.textPrimary} strokeWidth={2.3} />}
        >
          {t('common.actions.logout')}
        </Button>
      </PortalSectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  groupRows: {
    gap: spacing.sm,
  },
  row: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  mirrorIcon: {
    transform: [{ rotate: '180deg' }],
  },
});
