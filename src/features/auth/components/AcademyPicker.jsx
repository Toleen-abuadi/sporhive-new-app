import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../../components/ui/Text';
import { KeyboardAwareModalSheet } from '../../../components/ui/KeyboardAwareModalSheet';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { withAlpha } from '../../../theme/colors';
import { borderRadius, spacing } from '../../../theme/tokens';
import { Spinner } from '../../../components/ui/Spinner';

const normalizeSearch = (value) => String(value || '').trim().toLowerCase();

export function AcademyPicker({
  academies = [],
  selectedAcademy = null,
  recentAcademies = [],
  loading = false,
  error = '',
  onSelect,
}) {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredAcademies = useMemo(() => {
    const query = normalizeSearch(search);
    if (!query) return academies;
    return academies.filter((academy) => {
      const raw = `${academy?.name || ''} ${academy?.subtitle || ''}`;
      return normalizeSearch(raw).includes(query);
    });
  }, [academies, search]);

  const select = (academy) => {
    onSelect?.(academy);
    setOpen(false);
    setSearch('');
  };

  return (
    <View>
      <Text variant="caption" color={colors.textSecondary} style={styles.label}>
        {t('auth.fields.academy')}
      </Text>

      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          {
            borderColor: colors.inputBorder || colors.border,
            backgroundColor: colors.inputBackground || colors.surface,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <View style={styles.triggerText}>
          <Text weight="semibold" numberOfLines={1}>
            {selectedAcademy?.name || t('auth.placeholders.selectAcademy')}
          </Text>
          {selectedAcademy?.subtitle ? (
            <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {selectedAcademy.subtitle}
            </Text>
          ) : (
            <Text variant="caption" color={colors.textMuted} numberOfLines={1}>
              {t('auth.academy.helper')}
            </Text>
          )}
        </View>
        <Feather name="chevron-down" size={18} color={colors.textMuted} />
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
                {t('auth.fields.academy')}
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
                placeholder={t('auth.placeholders.searchAcademy')}
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

            {recentAcademies.length ? (
              <View style={[styles.recentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {recentAcademies.map((academy) => (
                  <Pressable
                    key={`recent-${academy.id}`}
                    onPress={() => select(academy)}
                    style={[
                      styles.recentChip,
                      {
                        borderColor: colors.inputBorder || colors.border,
                        backgroundColor: colors.inputBackground || colors.surface,
                      },
                    ]}
                  >
                    <Text variant="caption" weight="semibold">
                      {academy.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {loading ? (
              <View style={styles.loading}>
                <Spinner size="small" label={t('common.loading')} />
              </View>
            ) : error ? (
              <View style={styles.loading}>
                <Text variant="bodySmall" color={colors.error}>
                  {error}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredAcademies}
                keyExtractor={(item) => String(item.id)}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  <View style={styles.loading}>
                    <Text variant="bodySmall" color={colors.textMuted}>
                      {t('auth.academy.noResults')}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const active = item.id === selectedAcademy?.id;
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
                      <View style={styles.rowText}>
                        <Text weight="semibold">{item.name}</Text>
                        {item.subtitle ? (
                          <Text variant="caption" color={colors.textSecondary}>
                            {item.subtitle}
                          </Text>
                        ) : null}
                      </View>
                      {active ? <Feather name="check-circle" size={16} color={colors.accentOrange} /> : null}
                    </Pressable>
                  );
                }}
              />
            )}
          </KeyboardAwareModalSheet>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing.xs,
  },
  trigger: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  triggerText: {
    flex: 1,
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
    minHeight: 46,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 0,
  },
  recentRow: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recentChip: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  loading: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  row: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    minHeight: 52,
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowText: {
    flex: 1,
  },
});
