import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { CalendarClock, Compass, House, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from '../../constants/routes';
import { useI18n } from '../../hooks/useI18n';
import { useTheme } from '../../hooks/useTheme';
import { selectIsPlayer, useAuth } from '../../services/auth';
import { borderRadius, spacing } from '../../theme/tokens';
import { getRowDirection, getWritingDirection } from '../../utils/rtl';
import { getAcademyDiscoveryCopy } from '../../features/academyDiscovery/utils/academyDiscovery.copy';
import { getPlaygroundsCopy } from '../../features/playgrounds/utils/playgrounds.copy';
import { Text } from '../ui/Text';

const NON_SHELL_PATH_PREFIXES = [
  '/(auth)',
  '/(onboarding)',
  '/login',
  '/signup',
  '/reset-password',
  '/welcome',
  '/entry',
];

const PLAYER_PATH_PREFIXES = [
  '/(player)',
  '/home',
  '/payments',
  '/performance',
  '/store',
  '/news',
  '/freeze',
  '/renewal',
  '/profile',
];

const ACADEMIES_PATH_PREFIXES = ['/(public)/academies', '/academies'];
const PLAYGROUNDS_PATH_PREFIXES = [
  '/(public)/playgrounds',
  '/(booking)',
  '/playgrounds',
  '/venue',
  '/booking',
  '/my-bookings',
  '/rating',
  '/rating-token',
];
const SETTINGS_PATH_PREFIXES = ['/(settings)', '/settings'];

const normalizePath = (pathname) => {
  const raw = String(pathname || '').trim();
  if (!raw) return '/';
  if (raw.length > 1 && raw.endsWith('/')) {
    return raw.slice(0, -1);
  }
  return raw;
};

const matchesPrefix = (path, prefix) => path === prefix || path.startsWith(`${prefix}/`);
const matchesAnyPrefix = (path, prefixes) => prefixes.some((prefix) => matchesPrefix(path, prefix));

export function isServiceShellPath(pathname) {
  const path = normalizePath(pathname);
  if (path === '/') return false;
  if (matchesAnyPrefix(path, NON_SHELL_PATH_PREFIXES)) return false;
  return true;
}

const resolveActiveKey = (pathname, isPlayer) => {
  const path = normalizePath(pathname);

  if (matchesAnyPrefix(path, SETTINGS_PATH_PREFIXES)) {
    return 'settings';
  }
  if (matchesAnyPrefix(path, PLAYGROUNDS_PATH_PREFIXES)) {
    return 'playgrounds';
  }
  if (isPlayer && matchesAnyPrefix(path, PLAYER_PATH_PREFIXES)) {
    return 'player';
  }
  if (matchesAnyPrefix(path, ACADEMIES_PATH_PREFIXES)) {
    return 'academies';
  }
  return isPlayer ? 'player' : 'academies';
};

function ServiceTabButton({ item, active, onPress, colors, isRTL }) {
  const Icon = item.icon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabButton,
        {
          borderColor: active ? colors.accentOrange : 'transparent',
          backgroundColor: active ? colors.accentOrangeSoft : 'transparent',
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Icon
        size={19}
        color={active ? colors.accentOrange : colors.tabBarInactive || colors.textMuted}
        strokeWidth={active ? 2.4 : 2.2}
      />
      <Text
        numberOfLines={1}
        allowFontScaling={false}
        style={[
          styles.label,
          {
            color: active ? colors.accentOrange : colors.tabBarInactive || colors.textMuted,
            writingDirection: getWritingDirection(isRTL),
          },
        ]}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

export function ServiceBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const { locale, isRTL } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const isPlayer = selectIsPlayer(auth);
  const academyCopy = getAcademyDiscoveryCopy(locale);
  const playgroundsCopy = getPlaygroundsCopy(locale);
  const activeKey = resolveActiveKey(pathname, isPlayer);

  const fallbackAcademiesLabel = locale === 'ar' ? 'الأكاديميات' : 'Academies';
  const fallbackPlaygroundsLabel = locale === 'ar' ? 'الملاعب' : 'Playgrounds';
  const settingsLabel = locale === 'ar' ? 'الإعدادات' : 'Settings';
  const playerLabel = locale === 'ar' ? 'بوابة اللاعب' : 'Player Portal';

  const tabs = useMemo(() => {
    const items = [];

    if (isPlayer) {
      items.push({
        key: 'player',
        href: ROUTES.PLAYER_HOME,
        label: playerLabel,
        icon: House,
      });
    }

    items.push(
      {
        key: 'academies',
        href: ROUTES.ACADEMIES_HOME,
        label: academyCopy?.discovery?.title || fallbackAcademiesLabel,
        icon: Compass,
      },
      {
        key: 'playgrounds',
        href: ROUTES.PLAYGROUNDS_HOME,
        label: playgroundsCopy?.title || fallbackPlaygroundsLabel,
        icon: CalendarClock,
      },
      {
        key: 'settings',
        href: ROUTES.SETTINGS_HOME,
        label: settingsLabel,
        icon: Settings,
      }
    );

    return items;
  }, [
    academyCopy?.discovery?.title,
    fallbackAcademiesLabel,
    fallbackPlaygroundsLabel,
    isPlayer,
    playerLabel,
    playgroundsCopy?.title,
    settingsLabel,
  ]);

  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <View
      style={[
        styles.container,
        {
          borderTopColor: colors.tabBarBorder || colors.border,
          backgroundColor: colors.tabBarBackground || colors.surfaceElevated,
          paddingBottom: bottomInset,
        },
      ]}
    >
      <View style={[styles.row, { flexDirection: getRowDirection(isRTL) }]}>
        {tabs.map((item) => (
          <ServiceTabButton
            key={item.key}
            item={item}
            active={activeKey === item.key}
            colors={colors}
            isRTL={isRTL}
            onPress={() => {
              if (activeKey === item.key) return;
              router.replace(item.href);
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  row: {
    alignItems: 'stretch',
    gap: spacing.xs,
  },
  tabButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: Platform.OS === 'ios' ? '600' : '500',
    textAlign: 'center',
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined,
    includeFontPadding: false,
    paddingHorizontal: 2,
  },
});
