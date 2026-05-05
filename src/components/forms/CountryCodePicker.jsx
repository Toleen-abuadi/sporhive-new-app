import { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Text } from '../ui/Text';
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

  const titleLabel =
    title ||
    translateWithFallback(
      t,
      'common.phone.countryCode',
      translateWithFallback(t, 'auth.fields.countryCode', 'Country code')
    );

  const searchLabel =
    searchPlaceholder ||
    translateWithFallback(
      t,
      'common.phone.searchCountry',
      translateWithFallback(t, 'auth.placeholders.searchCountry', 'Search country code')
    );

  const noResultsText =
    noResultsLabel ||
    translateWithFallback(
      t,
      'common.phone.noCountryResults',
      translateWithFallback(t, 'auth.academy.noResults', 'No results')
    );

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

  const closeDialog = () => {
    setOpen(false);
    setSearch('');
  };

  const select = (country) => {
    onChange?.(String(country?.dialCode || selected?.dialCode || ''));
    closeDialog();
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
          style={styles.triggerIcon}
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeDialog}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[
            styles.backdrop,
            {
              backgroundColor: colors.overlay || withAlpha(colors.black, 0.45),
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDialog} />

          <View
            style={[
              styles.dialog,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.headerText}>
                <Text variant="h3" weight="bold" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                  {titleLabel}
                </Text>
              </View>

              <Pressable
                onPress={closeDialog}
                hitSlop={10}
                style={[
                  styles.closeBtn,
                  {
                    backgroundColor: colors.surfaceSoft || withAlpha(colors.textPrimary, 0.06),
                  },
                ]}
              >
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
                autoCorrect={false}
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
              style={styles.listBody}
              keyExtractor={(item) => `${item.iso2}-${item.dialCode}`}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
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
                      <Text weight="semibold" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                        {resolveCountryName(item, t)}
                      </Text>

                      <Text
                        variant="caption"
                        color={colors.textSecondary}
                        style={{ textAlign: isRTL ? 'right' : 'left' }}
                      >
                        {item.dialCode}
                      </Text>
                    </View>

                    {active ? (
                      <Feather name="check-circle" size={17} color={colors.accentOrange} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </KeyboardAvoidingView>
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
    flexDirection: 'row',
    direction: 'ltr',
    gap: spacing.xs,
  },
  triggerIcon: {
    marginLeft: spacing.xs,
  },
  flag: {
    fontSize: 15,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '82%',
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
  listBody: {
    flexGrow: 0,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  row: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    minHeight: 56,
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