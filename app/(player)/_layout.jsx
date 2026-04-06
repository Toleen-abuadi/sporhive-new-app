import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Redirect, Stack, usePathname, useRouter } from 'expo-router';
import {
  CalendarClock,
  CreditCard,
  Gauge,
  HandCoins,
  House,
  Newspaper,
  ShieldPlus,
  ShoppingBasket,
  ShoppingCart,
  UserRoundCog,
  X,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppShellMenuProvider } from '../../src/components/navigation/AppShellMenuContext';
import { Text } from '../../src/components/ui/Text';
import { ROUTES } from '../../src/constants/routes';
import { useI18n } from '../../src/hooks/useI18n';
import { useTheme } from '../../src/hooks/useTheme';
import {
  AuthBootScreen,
  AUTH_ROUTE_GROUPS,
  resolveGuardRedirect,
  shouldWaitForBootstrap,
  useAuth,
} from '../../src/services/auth';
import { borderRadius, spacing } from '../../src/theme/tokens';
import { getRowDirection, getWritingDirection } from '../../src/utils/rtl';
import {
  PlayerPortalProvider,
  PlayerUniformCartProvider,
} from '../../src/features/playerPortal/state';

const CLOSE_ANIMATION_MS = 180;
const OPEN_ANIMATION_MS = 220;

const isPathActive = (href, pathname) => {
  const route = String(href || '');
  const path = String(pathname || '');
  return path === route || path.startsWith(`${route}/`);
};

function PlayerMenuRow({ item, pathname, onPress, colors, isRTL }) {
  const Icon = item.icon;
  const active = isPathActive(item.href, pathname);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      onPress={() => onPress(item.href)}
      style={({ pressed }) => [
        styles.menuRow,
        {
          borderColor: active ? colors.accentOrange : colors.border,
          backgroundColor: active ? colors.accentOrangeSoft : colors.surface,
          flexDirection: getRowDirection(isRTL),
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.menuIconWrap,
          {
            backgroundColor: active ? colors.accentOrange : colors.accentOrangeSoft,
          },
        ]}
      >
        <Icon
          size={16}
          color={active ? colors.white : colors.accentOrange}
          strokeWidth={active ? 2.45 : 2.3}
        />
      </View>
      <Text
        variant="bodySmall"
        weight={active ? 'semibold' : 'medium'}
        style={[
          styles.menuLabel,
          {
            color: active ? colors.accentOrange : colors.textPrimary,
            writingDirection: getWritingDirection(isRTL),
          },
        ]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

function PlayerMenuDrawer({ visible, onClose, onNavigate }) {
  const pathname = usePathname();
  const { t, isRTL, locale } = useI18n();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const animation = useRef(new Animated.Value(0)).current;
  const drawerWidth = Math.min(Math.max(width * 0.82, 280), 360);
  const hiddenOffset = isRTL ? drawerWidth + 20 : -(drawerWidth + 20);

  const translateX = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [hiddenOffset, 0],
  });

  const overlayOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  useEffect(() => {
    Animated.timing(animation, {
      toValue: visible ? 1 : 0,
      duration: visible ? OPEN_ANIMATION_MS : CLOSE_ANIMATION_MS,
      useNativeDriver: true,
    }).start();
  }, [animation, visible]);

  const items = useMemo(
    () => [
      {
        key: 'home',
        label: t('playerPortal.navigation.tabs.home'),
        icon: House,
        href: ROUTES.PLAYER_HOME,
      },
      {
        key: 'payments',
        label: t('playerPortal.actions.payments'),
        icon: CreditCard,
        href: ROUTES.PLAYER_PAYMENTS,
      },
      {
        key: 'store',
        label: t('playerPortal.actions.store'),
        icon: ShoppingBasket,
        href: ROUTES.PLAYER_STORE,
      },
      {
        key: 'news',
        label: t('playerPortal.actions.news'),
        icon: Newspaper,
        href: ROUTES.PLAYER_NEWS,
      },
      {
        key: 'performance',
        label: t('playerPortal.actions.performance'),
        icon: Gauge,
        href: ROUTES.PLAYER_PERFORMANCE,
      },
      {
        key: 'profile',
        label: t('playerPortal.actions.profile'),
        icon: UserRoundCog,
        href: ROUTES.PLAYER_PROFILE,
      },
      {
        key: 'freeze',
        label: t('playerPortal.actions.freeze'),
        icon: HandCoins,
        href: ROUTES.PLAYER_FREEZE,
      },
      {
        key: 'renewal',
        label: t('playerPortal.actions.renewal'),
        icon: ShieldPlus,
        href: ROUTES.PLAYER_RENEWAL,
      },
      {
        key: 'orders',
        label: t('playerPortal.store.actions.myOrders'),
        icon: ShoppingCart,
        href: ROUTES.PLAYER_STORE_ORDERS,
      },
      {
        key: 'booking',
        label: t('playerPortal.actions.booking'),
        icon: CalendarClock,
        href: ROUTES.PLAYGROUNDS_HOME,
      },
    ],
    [t]
  );

  const title = locale === 'ar' ? 'بوابة اللاعب' : 'Player Portal';
  const subtitle =
    locale === 'ar' ? 'كل الأقسام متاحة مباشرة بدون قائمة المزيد' : 'All sections are available directly';

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Animated.View
          style={[
            styles.overlay,
            {
              backgroundColor: colors.overlay,
              opacity: overlayOpacity,
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawer,
            {
              width: drawerWidth,
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              [isRTL ? 'right' : 'left']: 0,
              transform: [{ translateX }],
            },
          ]}
        >
          <SafeAreaView style={styles.drawerSafeArea} edges={['top', 'bottom']}>
            <View style={[styles.drawerHeader, { flexDirection: getRowDirection(isRTL) }]}>
              <View style={styles.drawerTitleWrap}>
                <Text variant="h3" weight="semibold" style={{ writingDirection: getWritingDirection(isRTL) }}>
                  {title}
                </Text>
                <Text
                  variant="caption"
                  color={colors.textSecondary}
                  style={{ writingDirection: getWritingDirection(isRTL) }}
                >
                  {subtitle}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={locale === 'ar' ? 'إغلاق القائمة' : 'Close menu'}
                onPress={onClose}
                style={({ pressed }) => [
                  styles.closeButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: pressed ? colors.surfaceSoft : colors.surface,
                  },
                ]}
              >
                <X size={16} color={colors.textPrimary} strokeWidth={2.3} />
              </Pressable>
            </View>

            <View style={styles.menuList}>
              {items.map((item) => (
                <PlayerMenuRow
                  key={item.key}
                  item={item}
                  pathname={pathname}
                  onPress={onNavigate}
                  colors={colors}
                  isRTL={isRTL}
                />
              ))}
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function PlayerLayout() {
  const auth = useAuth();
  const pathname = usePathname();
  const { colors } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const router = useRouter();
  const previousPathRef = useRef(pathname);

  const openMenu = useCallback(() => {
    setMenuVisible(true);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  const handleNavigate = useCallback(
    (href) => {
      closeMenu();
      if (isPathActive(href, pathname)) return;
      router.replace(href);
    },
    [closeMenu, pathname, router]
  );

  useEffect(() => {
    if (previousPathRef.current !== pathname && menuVisible) {
      closeMenu();
    }
    previousPathRef.current = pathname;
  }, [closeMenu, menuVisible, pathname]);

  if (shouldWaitForBootstrap(auth)) {
    return <AuthBootScreen />;
  }

  const redirect = resolveGuardRedirect(AUTH_ROUTE_GROUPS.PLAYER, auth);
  if (redirect) {
    return <Redirect href={redirect} />;
  }

  return (
    <PlayerPortalProvider>
      <PlayerUniformCartProvider>
        <AppShellMenuProvider openMenu={openMenu} closeMenu={closeMenu}>
          <View style={styles.root}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'fade_from_bottom',
                contentStyle: {
                  backgroundColor: colors.background,
                },
              }}
            />
            <PlayerMenuDrawer visible={menuVisible} onClose={closeMenu} onNavigate={handleNavigate} />
          </View>
        </AppShellMenuProvider>
      </PlayerUniformCartProvider>
    </PlayerPortalProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  modalRoot: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 1,
  },
  drawerSafeArea: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  drawerHeader: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  drawerTitleWrap: {
    flex: 1,
    gap: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuList: {
    gap: spacing.sm,
  },
  menuRow: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
  },
});
