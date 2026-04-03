import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { withAlpha } from '../../../theme/colors';
import { borderRadius, spacing } from '../../../theme/tokens';
import { AUTH_COUNTRIES } from '../constants/countries';

const normalizeSearch = (value) => String(value || '').trim().toLowerCase();

export function CountryCodePicker({
  value,
  onChange,
  options = AUTH_COUNTRIES,
  style,
  disabled = false,
}) {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = useMemo(
    () => options.find((item) => item.dialCode === value) || options[0],
    [options, value]
  );

  const filtered = useMemo(() => {
    const query = normalizeSearch(search);
    if (!query) return options;

    return options.filter((item) => {
      const text = normalizeSearch(`${item.dialCode} ${item.iso2} ${t(item.nameKey)}`);
      return text.includes(query);
    });
  }, [options, search, t]);

  const select = (country) => {
    onChange?.(country?.dialCode || selected?.dialCode);
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
            borderColor: colors.border,
            backgroundColor: colors.surface,
            flexDirection: 'row',
            direction: 'ltr',
            opacity: disabled ? 0.55 : 1,
          },
        ]}
      >
        <Text style={styles.flag}>{selected?.flag || '🌍'}</Text>
        <Text variant="bodySmall" weight="bold">
          {selected?.dialCode}
        </Text>
        <Feather
          name="chevron-down"
          size={16}
          color={colors.textSecondary}
          style={{ marginLeft: spacing.xs }}
        />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.backdrop, { backgroundColor: withAlpha(colors.black, 0.45) }]}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.sheetHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text variant="h3" weight="bold">
                {t('auth.fields.countryCode')}
              </Text>
              <Pressable onPress={() => setOpen(false)} style={styles.closeBtn}>
                <Feather name="x" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View
              style={[
                styles.searchInputWrap,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Feather name="search" size={16} color={colors.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t('auth.placeholders.searchCountry')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                style={[
                  styles.searchInput,
                  {
                    color: colors.textPrimary,
                    textAlign: isRTL ? 'right' : 'left',
                  },
                ]}
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => `${item.iso2}-${item.dialCode}`}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                const active = item.dialCode === selected?.dialCode;
                return (
                  <Pressable
                    onPress={() => select(item)}
                    style={[
                      styles.row,
                      {
                        borderColor: active ? colors.accentOrange : colors.border,
                        backgroundColor: active ? withAlpha(colors.accentOrange, 0.12) : colors.surface,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <Text style={styles.flag}>{item.flag}</Text>
                    <View style={styles.countryText}>
                      <Text weight="semibold">{t(item.nameKey)}</Text>
                      <Text variant="caption" color={colors.textSecondary}>
                        {item.dialCode}
                      </Text>
                    </View>
                    {active ? <Feather name="check-circle" size={16} color={colors.accentOrange} /> : null}
                  </Pressable>
                );
              }}
            />
          </View>
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
  sheet: {
    maxHeight: '82%',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: spacing.lg,
    gap: spacing.sm,
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
});
