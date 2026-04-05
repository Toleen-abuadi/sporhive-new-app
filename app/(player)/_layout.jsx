import { useMemo } from "react";
import { Platform, Text } from "react-native";
import { Redirect, Tabs } from "expo-router";
import {
  CreditCard,
  Ellipsis,
  House,
  ShoppingBasket,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AuthBootScreen,
  AUTH_ROUTE_GROUPS,
  resolveGuardRedirect,
  shouldWaitForBootstrap,
  useAuth,
} from "../../src/services/auth";
import { useI18n } from "../../src/hooks/useI18n";
import { useTheme } from "../../src/hooks/useTheme";
import {
  PlayerPortalProvider,
  PlayerUniformCartProvider,
} from "../../src/features/playerPortal/state";

const PRIMARY_TABS = Object.freeze([
  {
    name: "home",
    labelKey: "playerPortal.navigation.tabs.home",
    fallbackLabel: "Home",
    icon: House,
  },
  {
    name: "payments/index",
    labelKey: "playerPortal.navigation.tabs.payments",
    fallbackLabel: "Payments",
    icon: CreditCard,
  },
  {
    name: "store/index",
    labelKey: "playerPortal.navigation.tabs.store",
    fallbackLabel: "Store",
    icon: ShoppingBasket,
  },
  {
    name: "more",
    labelKey: "playerPortal.navigation.tabs.more",
    fallbackLabel: "More",
    icon: Ellipsis,
  },
]);

const HIDDEN_TAB_OPTIONS = {
  href: null,
};

export default function PlayerLayout() {
  const auth = useAuth();
  const { t, isRTL } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const bottomInset = Math.max(insets.bottom, 8);
  const tabBarHeight = 58 + bottomInset;

  const tabs = useMemo(
    () =>
      PRIMARY_TABS.map((tab) => {
        const raw = String(t(tab.labelKey)).trim();
        const label = raw && raw !== tab.labelKey ? raw : tab.fallbackLabel;
        return { ...tab, label };
      }),
    [t],
  );

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarHideOnKeyboard: true,
      sceneStyle: { backgroundColor: colors.background },
      tabBarShowLabel: true,
      tabBarAllowFontScaling: false,
      tabBarLabelPosition: "below-icon",
      tabBarActiveTintColor: colors.tabBarActive || colors.accentOrange,
      tabBarInactiveTintColor: colors.tabBarInactive || colors.textMuted,
      tabBarStyle: {
        borderTopWidth: 1,
        borderTopColor: colors.tabBarBorder || colors.border,
        backgroundColor: colors.tabBarBackground || colors.surfaceElevated,
        height: tabBarHeight,
        paddingTop: 6,
        paddingBottom: bottomInset,
        paddingHorizontal: 8,
      },
      tabBarItemStyle: {
        paddingTop: 2,
        paddingBottom: 1,
        borderRadius: 12,
        marginHorizontal: 2,
      },
      tabBarIconStyle: {
        marginBottom: 1,
      },
    }),
    [bottomInset, colors, tabBarHeight],
  );

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
        <Tabs screenOptions={screenOptions}>
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <Tabs.Screen
                key={tab.name}
                name={tab.name}
                options={{
                  title: tab.label,
                  tabBarLabel: ({ color }) => (
                    <Text
                      numberOfLines={1}
                      allowFontScaling={false}
                      style={{
                        fontSize: 11,
                        fontWeight: Platform.OS === "ios" ? "600" : "500",
                        lineHeight: 13,
                        textTransform: "none",
                        color,
                        textAlign: "center",
                        writingDirection: isRTL ? "rtl" : "ltr",

                        // Critical fix for Arabic on Android
                        fontFamily:
                          Platform.OS === "android" ? "sans-serif" : undefined,

                        // Avoid clipping / weird Android font behavior
                        includeFontPadding: false,
                      }}
                    >
                      {tab.label}
                    </Text>
                  ),
                  tabBarIcon: ({ color, size, focused }) => (
                    <Icon
                      size={size}
                      color={color}
                      strokeWidth={focused ? 2.35 : 2.2}
                    />
                  ),
                }}
              />
            );
          })}

          <Tabs.Screen name="freeze/index" options={HIDDEN_TAB_OPTIONS} />
          <Tabs.Screen name="renewal/index" options={HIDDEN_TAB_OPTIONS} />
          <Tabs.Screen name="news/index" options={HIDDEN_TAB_OPTIONS} />
          <Tabs.Screen name="news/[newsId]" options={HIDDEN_TAB_OPTIONS} />
          <Tabs.Screen name="performance/index" options={HIDDEN_TAB_OPTIONS} />
          <Tabs.Screen name="profile/index" options={HIDDEN_TAB_OPTIONS} />
          <Tabs.Screen name="profile/edit" options={HIDDEN_TAB_OPTIONS} />
          <Tabs.Screen
            name="payments/[paymentId]/index"
            options={HIDDEN_TAB_OPTIONS}
          />
          <Tabs.Screen
            name="payments/[paymentId]/invoice"
            options={HIDDEN_TAB_OPTIONS}
          />
          <Tabs.Screen name="store/cart" options={HIDDEN_TAB_OPTIONS} />
          <Tabs.Screen name="store/checkout" options={HIDDEN_TAB_OPTIONS} />
          <Tabs.Screen
            name="store/product/[productId]"
            options={HIDDEN_TAB_OPTIONS}
          />
          <Tabs.Screen name="store/orders/index" options={HIDDEN_TAB_OPTIONS} />
          <Tabs.Screen
            name="store/orders/[orderRef]"
            options={HIDDEN_TAB_OPTIONS}
          />
        </Tabs>
      </PlayerUniformCartProvider>
    </PlayerPortalProvider>
  );
}
