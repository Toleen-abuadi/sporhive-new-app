import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '../ui/Text';
import { KeyboardAwareModalSheet } from '../ui/KeyboardAwareModalSheet';
import { useI18n } from '../../hooks/useI18n';
import { useTheme } from '../../hooks/useTheme';
import { withAlpha } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/tokens';
import { PHONE_COUNTRIES } from '../../constants/phoneCountries';

const normalizeSearch = (value) => String(value || '').trim().toLowerCase();

const translateWithFallback = (t, key, fallback) => {
  const translated = t(key);
  if (translated && translated !== key) return translated;
  return fallback;
};

const resolveCountryName = (item, t) => {
  if (item?.nameKey) return t(item.nameKey);
  if (item?.name) return String(item.name);
  return String(item?.iso2 || '');
};

export function CountryCodePicker({
  value,
  onChange,
  options = PHONE_COUNTRIES,
  style,
  disabled = false,
  title,
  searchPlaceholder,
  noResultsLabel,
}) {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const titleLabel = title ||
    translateWithFallback(t, 'common.phone.countryCode', translateWithFallback(t, 'auth.fields.countryCode', 'Country code'));
  const searchLabel = searchPlaceholder ||
    translateWithFallback(
      t,
      'common.phone.searchCountry',
      translateWithFallback(t, 'auth.placeholders.searchCountry', 'Search country code')
    );
  const noResultsText = noResultsLabel ||
    translateWithFallback(t, 'common.phone.noCountryResults', translateWithFallback(t, 'auth.academy.noResults', 'No results'));

  const selected = useMemo(
    () => options.find((item) => String(item.dialCode) === String(value)) || options[0],
    [options, value]
  );

  const filtered = useMemo(() => {
    const query = normalizeSearch(search);
    if (!query) return options;

    return options.filter((item) => {
      const text = normalizeSearch(
        `${item?.dialCode || ''} ${item?.iso2 || ''} ${resolveCountryName(item, t)}`
      );
      return text.includes(query);
    });
  }, [options, search, t]);

  const select = (country) => {
    onChange?.(String(country?.dialCode || selected?.dialCode || ''));
    setOpen(false);
    setSearch('');
  };

  return (
    <>
      <Pressable
        onPress={() => {
          if (disabled) return;
          setOpen(true);
        }}
        style={[
          styles.trigger,
          style,
          {
            borderColor: colors.inputBorder || colors.border,
            backgroundColor: disabled
              ? colors.inputBackgroundDisabled || colors.surfaceSoft
              : colors.inputBackground || colors.surface,
            flexDirection: 'row',
            direction: 'ltr',
            opacity: disabled ? 0.55 : 1,
          },
        ]}
      >
        <Text style={styles.flag}>{selected?.flag || 'WW'}</Text>
        <Text variant="bodySmall" weight="bold">
          {selected?.dialCode || ''}
        </Text>
        <Feather
          name="chevron-down"
          size={16}
          color={colors.textSecondary}
          style={{ marginLeft: spacing.xs }}
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View style={[styles.backdrop, { backgroundColor: colors.overlay || withAlpha(colors.black, 0.45) }]}>
          <KeyboardAwareModalSheet
            backgroundColor={colors.background}
            borderColor={colors.border}
          >
            <View style={[styles.sheetHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text variant="h3" weight="bold">
                {titleLabel}
              </Text>
              <Pressable onPress={() => setOpen(false)} style={styles.closeBtn}>
                <Feather name="x" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View
              style={[
                styles.searchInputWrap,
                {
                  borderColor: colors.inputBorder || colors.border,
                  backgroundColor: colors.inputBackground || colors.surface,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Feather name="search" size={16} color={colors.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={searchLabel}
                placeholderTextColor={colors.inputPlaceholder || colors.textMuted}
                autoCapitalize="none"
                keyboardAppearance={isDark ? 'dark' : 'light'}
                style={[
                  styles.searchInput,
                  {
                    color: colors.inputText || colors.textPrimary,
                    textAlign: isRTL ? 'right' : 'left',
                  },
                ]}
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => `${item.iso2}-${item.dialCode}`}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text variant="caption" color={colors.textMuted}>
                    {noResultsText}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const active = String(item.dialCode) === String(selected?.dialCode);
                return (
                  <Pressable
                    onPress={() => select(item)}
                    style={[
                      styles.row,
                      {
                        borderColor: active
                          ? colors.inputBorderFocus || colors.accentOrange
                          : colors.inputBorder || colors.border,
                        backgroundColor: active
                          ? withAlpha(colors.accentOrange, 0.12)
                          : colors.inputBackground || colors.surface,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <Text style={styles.flag}>{item.flag || item.iso2}</Text>
                    <View style={styles.countryText}>
                      <Text weight="semibold">{resolveCountryName(item, t)}</Text>
                      <Text variant="caption" color={colors.textSecondary}>
                        {item.dialCode}
                      </Text>
                    </View>
                    {active ? (
                      <Feather name="check-circle" size={16} color={colors.accentOrange} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </KeyboardAwareModalSheet>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minWidth: 108,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  flag: {
    fontSize: 15,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputWrap: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    minHeight: 46,
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 0,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  row: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    minHeight: 54,
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  countryText: {
    flex: 1,
  },
  emptyWrap: {
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
