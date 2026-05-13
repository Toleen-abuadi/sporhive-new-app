import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import {
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Search,
  RotateCcw,
} from "lucide-react-native";

import { DatePickerField } from "../../../components/ui/DatePickerField";
import { Button } from "../../../components/ui/Button";
import { Chip } from "../../../components/ui/Chip";
import { Surface } from "../../../components/ui/Surface";
import { Text } from "../../../components/ui/Text";
import { useI18n } from "../../../hooks/useI18n";
import { useTheme } from "../../../hooks/useTheme";
import { borderRadius, spacing } from "../../../theme/tokens";
import { getRowDirection } from "../../../utils/rtl";

const SPORTS_FILTERS = Object.freeze([
  { id: "", labelKey: "playgrounds.filters.sports.allSports" },
  { id: "football", labelKey: "playgrounds.filters.sports.football" },
  { id: "basketball", labelKey: "playgrounds.filters.sports.basketball" },
  { id: "tennis", labelKey: "playgrounds.filters.sports.tennis" },
  { id: "swimming", labelKey: "playgrounds.filters.sports.swimming" },
  { id: "gym", labelKey: "playgrounds.filters.sports.gym" },
]);

const MARKETPLACE_TABS = Object.freeze([
  { id: "all", labelKey: "playgrounds.filters.tabs.all" },
  { id: "offers", labelKey: "playgrounds.filters.tabs.offers" },
  { id: "featured", labelKey: "playgrounds.filters.tabs.featured" },
  { id: "premium", labelKey: "playgrounds.filters.tabs.premium" },
  { id: "pro", labelKey: "playgrounds.filters.tabs.pro" },
]);

const SORT_OPTIONS = Object.freeze([
  { id: "recommended", labelKey: "playgrounds.filters.sort.recommended" },
  { id: "price_asc", labelKey: "playgrounds.filters.sort.priceLowHigh" },
  { id: "price_desc", labelKey: "playgrounds.filters.sort.priceHighLow" },
  { id: "distance_asc", labelKey: "playgrounds.filters.sort.nearest" },
  { id: "rating_desc", labelKey: "playgrounds.filters.sort.highestRated" },
]);

const todayIsoDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const safeTextInputAlign = (isRTL) => ({
  textAlign: isRTL ? "right" : "left",
  writingDirection: isRTL ? "rtl" : "ltr",
});

const resolveTextStyle = (isRTL) => ({
  textAlign: isRTL ? "right" : "left",
  writingDirection: isRTL ? "rtl" : "ltr",
});

export function PlaygroundsFilterForm({
  filters,
  activeTab,
  durationOptions = [],
  activeFiltersCount = 0,
  canReset = false,
  searching = false,
  onChange,
  onTabChange,
  onSortChange,
  onSearch,
  onReset,
}) {
  const { t, isRTL } = useI18n();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const selectedSort = String(filters?.orderBy || "recommended");
  const selectedSport = String(filters?.activityId || "");
  const rowDirection = getRowDirection(isRTL);
  const textStyle = resolveTextStyle(isRTL);

  const showDurationFilters = useMemo(
    () => Array.isArray(durationOptions) && durationOptions.length > 0,
    [durationOptions],
  );

  const selectedSortLabel =
    SORT_OPTIONS.find((option) => option.id === selectedSort)?.labelKey ||
    "playgrounds.filters.sort.recommended";

  return (
    <Surface variant="soft" padding="sm" style={styles.surface}>
      <View style={styles.content}>
        <View style={[styles.topRow, { flexDirection: rowDirection }]}>
          <Pressable
            onPress={() => setExpanded((value) => !value)}
            style={[
              styles.collapseButton,
              {
                flexDirection: rowDirection,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: colors.accentOrangeSoft },
              ]}
            >
              <SlidersHorizontal
                size={16}
                color={colors.accentOrange}
                strokeWidth={2.4}
              />
            </View>

            <View style={styles.titleBlock}>
              <Text variant="bodySmall" weight="bold" style={textStyle}>
                {t("playgrounds.filters.title", { defaultValue: "Filters" })}
              </Text>
              <Text
                variant="caption"
                color={colors.textMuted}
                numberOfLines={1}
                style={textStyle}
              >
                {activeFiltersCount > 0
                  ? t("playgrounds.filters.activeCount", {
                      count: activeFiltersCount,
                    })
                  : t(selectedSortLabel)}
              </Text>
            </View>

            {expanded ? (
              <ChevronUp
                size={18}
                color={colors.textSecondary}
                strokeWidth={2.2}
              />
            ) : (
              <ChevronDown
                size={18}
                color={colors.textSecondary}
                strokeWidth={2.2}
              />
            )}
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.chipsRow,
            { flexDirection: rowDirection },
          ]}
          ref={(ref) => {
            if (ref && isRTL) {
              requestAnimationFrame(() => {
                ref.scrollToEnd({ animated: false });
              });
            }
          }}
        >
          {MARKETPLACE_TABS.map((tab) => (
            <Chip
              key={tab.id}
              label={t(tab.labelKey)}
              selected={activeTab === tab.id}
              onPress={() => onTabChange?.(tab.id)}
            />
          ))}
        </ScrollView>

        {expanded ? (
          <View style={styles.expandedContent}>
            <View style={styles.section}>
              <Text
                variant="caption"
                color={colors.textSecondary}
                style={textStyle}
              >
                {t("playgrounds.filters.fields.sport", {
                  defaultValue: "Sport",
                })}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.chipsRow,
                  { flexDirection: rowDirection },
                ]}
                ref={(ref) => {
                  if (ref && isRTL) {
                    requestAnimationFrame(() => {
                      ref.scrollToEnd({ animated: false });
                    });
                  }
                }}
              >
                {SPORTS_FILTERS.map((sport) => (
                  <Chip
                    key={sport.id || "all"}
                    label={t(sport.labelKey)}
                    selected={selectedSport === sport.id}
                    onPress={() => onChange?.("activityId", sport.id)}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={[styles.grid, { flexDirection: rowDirection }]}>
              <View style={styles.gridItem}>
                <DatePickerField
                  label={t("playgrounds.filters.fields.date")}
                  value={String(filters?.date || "")}
                  onChange={(value) => onChange?.("date", value)}
                  placeholder={t("common.formats.isoDatePlaceholder")}
                  minDate={todayIsoDate()}
                />
              </View>

              <View style={styles.gridItem}>
                <Text
                  variant="caption"
                  color={colors.textSecondary}
                  style={textStyle}
                >
                  {t("playgrounds.filters.fields.players")}
                </Text>
                <TextInput
                  keyboardType="number-pad"
                  value={String(filters?.numberOfPlayers || "")}
                  onChangeText={(value) => onChange?.("numberOfPlayers", value)}
                  placeholder={t("playgrounds.filters.placeholders.players")}
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input,
                    safeTextInputAlign(isRTL),
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      color: colors.textPrimary,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text
                variant="caption"
                color={colors.textSecondary}
                style={textStyle}
              >
                {t("playgrounds.filters.fields.location")}
              </Text>
              <TextInput
                value={String(filters?.baseLocation || "")}
                onChangeText={(value) => onChange?.("baseLocation", value)}
                placeholder={t("playgrounds.filters.placeholders.location")}
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  safeTextInputAlign(isRTL),
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    color: colors.textPrimary,
                  },
                ]}
              />
            </View>

            {showDurationFilters ? (
              <View style={styles.section}>
                <Text
                  variant="caption"
                  color={colors.textSecondary}
                  style={textStyle}
                >
                  {t("playgrounds.filters.fields.duration")}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.chipsRow,
                    { flexDirection: rowDirection },
                  ]}
                  ref={(ref) => {
                    if (ref && isRTL) {
                      requestAnimationFrame(() => {
                        ref.scrollToEnd({ animated: false });
                      });
                    }
                  }}
                >
                  {durationOptions.map((item) => (
                    <Chip
                      key={item.id}
                      label={item.label}
                      selected={
                        String(filters?.durationId || "") === String(item.id)
                      }
                      onPress={() =>
                        onChange?.("durationId", String(item.id || ""))
                      }
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View
              style={[
                styles.specialOfferRow,
                {
                  flexDirection: rowDirection,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <View style={styles.titleBlock}>
                <Text variant="bodySmall" weight="semibold" style={textStyle}>
                  {t("playgrounds.filters.fields.specialOffers")}
                </Text>
              </View>

              <Switch
                value={Boolean(filters?.hasSpecialOffer)}
                onValueChange={(value) =>
                  onChange?.("hasSpecialOffer", Boolean(value))
                }
                trackColor={{
                  false: colors.border,
                  true: colors.accentOrangeSoft,
                }}
                thumbColor={
                  Boolean(filters?.hasSpecialOffer)
                    ? colors.accentOrange
                    : colors.surface
                }
              />
            </View>

            <View style={styles.section}>
              <Text
                variant="caption"
                color={colors.textSecondary}
                style={textStyle}
              >
                {t("playgrounds.filters.fields.sort")}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.chipsRow,
                  { flexDirection: rowDirection },
                ]}
                ref={(ref) => {
                  if (ref && isRTL) {
                    requestAnimationFrame(() => {
                      ref.scrollToEnd({ animated: false });
                    });
                  }
                }}
              >
                {SORT_OPTIONS.map((option) => (
                  <Chip
                    key={option.id}
                    label={t(option.labelKey)}
                    selected={selectedSort === option.id}
                    onPress={() => onSortChange?.(option.id)}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={[styles.actionsRow, { flexDirection: rowDirection }]}>
              <Button
                size="sm"
                style={styles.actionButton}
                loading={searching}
                disabled={searching}
                onPress={onSearch}
                leadingIcon={
                  <Search size={14} color={colors.white} strokeWidth={2.3} />
                }
              >
                {t("playgrounds.filters.actions.search")}
              </Button>

              {canReset ? (
                <Button
                  size="sm"
                  variant="secondary"
                  style={styles.actionButton}
                  onPress={onReset}
                  disabled={searching}
                  leadingIcon={
                    <RotateCcw
                      size={14}
                      color={colors.textPrimary}
                      strokeWidth={2.3}
                    />
                  }
                >
                  {t("playgrounds.filters.actions.reset")}
                </Button>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: borderRadius.xl,
  },
  content: {
    gap: spacing.sm,
  },
  topRow: {
    alignItems: "center",
    gap: spacing.sm,
  },
  collapseButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  expandedContent: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.xs,
  },
  chipsRow: {
    gap: spacing.xs,
    paddingVertical: 2,
    paddingHorizontal: 1,
  },
  grid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  gridItem: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
  },
  specialOfferRow: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  actionsRow: {
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
