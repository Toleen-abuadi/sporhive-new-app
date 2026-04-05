import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { CalendarDays, ChevronDown } from 'lucide-react-native';
import { useI18n } from '../../hooks/useI18n';
import { useTheme } from '../../hooks/useTheme';
import { getRowDirection } from '../../utils/rtl';
import { withAlpha } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/tokens';
import { Text } from './Text';

const normalizeDate = (value) => {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0, 0);
  }

  const raw = String(value).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;

  const [year, month, day] = raw.split('-').map(Number);
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const toISODate = (value) => {
  const date = normalizeDate(value);
  if (!date) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const clampDate = (date, minimumDate, maximumDate) => {
  const target = normalizeDate(date);
  if (!target) return null;

  const min = normalizeDate(minimumDate);
  const max = normalizeDate(maximumDate);

  if (min && target.getTime() < min.getTime()) return min;
  if (max && target.getTime() > max.getTime()) return max;
  return target;
};

const formatDisplayDate = (value, locale) => {
  const date = normalizeDate(value);
  if (!date) return '';

  try {
    return date.toLocaleDateString(locale === 'ar' ? 'ar-JO' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return toISODate(date);
  }
};

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = '',
  helperText = '',
  error = '',
  minDate = null,
  maxDate = null,
  disabled = false,
}) {
  const { colors } = useTheme();
  const { isRTL, locale, t } = useI18n();

  const [showIOSPicker, setShowIOSPicker] = useState(false);
  const [draftDate, setDraftDate] = useState(() => normalizeDate(value) || new Date());

  const minimumDate = useMemo(() => normalizeDate(minDate), [minDate]);
  const maximumDate = useMemo(() => normalizeDate(maxDate), [maxDate]);
  const resolvedDate = useMemo(
    () => clampDate(value, minimumDate, maximumDate) || minimumDate || new Date(),
    [maximumDate, minimumDate, value]
  );
  const displayValue = useMemo(() => formatDisplayDate(value, locale), [locale, value]);

  const commitDate = (selectedDate) => {
    const bounded = clampDate(selectedDate, minimumDate, maximumDate);
    if (!bounded) return;
    onChange?.(toISODate(bounded));
  };

  const openPicker = () => {
    if (disabled) return;

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: resolvedDate,
        mode: 'date',
        is24Hour: true,
        minimumDate: minimumDate || undefined,
        maximumDate: maximumDate || undefined,
        onChange: (event, selectedDate) => {
          if (event?.type !== 'set' || !selectedDate) return;
          commitDate(selectedDate);
        },
      });
      return;
    }

    if (Platform.OS === 'ios') {
      setDraftDate(resolvedDate);
      setShowIOSPicker(true);
      return;
    }

    const promptValue = globalThis.prompt?.(
      placeholder || t('common.actions.selectDate'),
      toISODate(resolvedDate)
    );
    if (!promptValue) return;
    const parsed = normalizeDate(promptValue);
    if (parsed) commitDate(parsed);
  };

  const closeIOSPicker = () => {
    setShowIOSPicker(false);
  };

  const confirmIOSPicker = () => {
    commitDate(draftDate);
    closeIOSPicker();
  };

  return (
    <View style={styles.container}>
      {label ? (
        <Text variant="caption" color={colors.textSecondary}>
          {label}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={openPicker}
        style={({ pressed }) => [
          styles.trigger,
          {
            flexDirection: getRowDirection(isRTL),
            borderColor: error
              ? colors.inputBorderError || colors.error
              : colors.inputBorder || colors.border,
            backgroundColor: disabled
              ? colors.inputBackgroundDisabled || colors.surfaceSoft
              : colors.inputBackground || colors.surface,
            opacity: disabled ? 0.56 : pressed ? 0.84 : 1,
          },
        ]}
      >
        <View style={[styles.valueWrap, { flexDirection: getRowDirection(isRTL) }]}>
          <CalendarDays size={15} color={colors.accentOrange} strokeWidth={2.2} />
          <Text
            variant="bodySmall"
            color={displayValue ? colors.textPrimary : colors.textMuted}
            style={styles.valueText}
            numberOfLines={1}
          >
            {displayValue || placeholder || t('common.actions.selectDate')}
          </Text>
        </View>
        <ChevronDown size={15} color={colors.textMuted} strokeWidth={2.2} />
      </Pressable>

      {error ? (
        <Text variant="caption" color={colors.error}>
          {error}
        </Text>
      ) : helperText ? (
        <Text variant="caption" color={colors.textMuted}>
          {helperText}
        </Text>
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={showIOSPicker} transparent animationType="fade" onRequestClose={closeIOSPicker}>
          <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay || withAlpha(colors.black, 0.45) }]}>
            <View
              style={[
                styles.modalSheet,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.modalHeader,
                  {
                    flexDirection: getRowDirection(isRTL),
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Pressable accessibilityRole="button" onPress={closeIOSPicker} style={styles.modalAction}>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {t('common.actions.cancel')}
                  </Text>
                </Pressable>
                <Text variant="bodySmall" weight="semibold" style={styles.modalTitle} numberOfLines={1}>
                  {label || t('common.actions.selectDate')}
                </Text>
                <Pressable accessibilityRole="button" onPress={confirmIOSPicker} style={styles.modalAction}>
                  <Text variant="bodySmall" weight="semibold" color={colors.accentOrange}>
                    {t('common.actions.done')}
                  </Text>
                </Pressable>
              </View>

              <DateTimePicker
                value={draftDate}
                mode="date"
                display="spinner"
                minimumDate={minimumDate || undefined}
                maximumDate={maximumDate || undefined}
                onChange={(_, selectedDate) => {
                  if (!selectedDate) return;
                  setDraftDate(selectedDate);
                }}
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  trigger: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  valueWrap: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  valueText: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalSheet: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalAction: {
    minWidth: 56,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  iosPicker: {
    width: '100%',
    height: 210,
  },
});
