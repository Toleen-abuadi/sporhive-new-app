import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { CalendarDays, ChevronDown, Filter, MapPin, Search, Users } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import { DatePickerField } from '../../../components/ui/DatePickerField';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import { ActivityChips } from './ActivityChips';

const toNumberLabel = (value) => {
  if (value == null || value === '') return '';
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  return String(Math.floor(numeric));
};

export function PlaygroundsFilterForm({
  locale = 'en',
  isRTL = false,
  copy,
  allSportsLabel = '',
  activityOptions = [],
  selectedActivityId = '',
  selectedDate = '',
  selectedPlayers = null,
  selectedLocation = '',
  selectedDurationId = '',
  durationOptions = [],
  showAdvanced = false,
  onToggleAdvanced,
  onSelectActivity,
  onSelectDate,
  onSelectPlayers,
  onSelectLocation,
  onSelectDuration,
  onSearch,
  onReset,
}) {
  const { colors } = useTheme();
  const [playersInput, setPlayersInput] = useState(() => toNumberLabel(selectedPlayers));

  useEffect(() => {
    setPlayersInput(toNumberLabel(selectedPlayers));
  }, [selectedPlayers]);

  const activeFiltersCount = useMemo(
    () =>
      [
        Boolean(selectedActivityId),
        Boolean(selectedDate),
        selectedPlayers != null,
        Boolean(String(selectedLocation || '').trim()),
        Boolean(selectedDurationId),
      ].filter(Boolean).length,
    [selectedActivityId, selectedDate, selectedPlayers, selectedLocation, selectedDurationId]
  );

  const handlePlayersChange = (value) => {
    const normalized = String(value || '').replace(/[^\d]/g, '');
    setPlayersInput(normalized);
    if (!normalized) {
      onSelectPlayers?.(null);
      return;
    }
    const numeric = Number(normalized);
    onSelectPlayers?.(Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : null);
  };

  return (
    <Surface variant="soft" padding="md" style={styles.card}>
      <View style={[styles.primaryRow, { flexDirection: getRowDirection(isRTL) }]}>
        <View style={[styles.filtersTitleWrap, { flexDirection: getRowDirection(isRTL) }]}>
          <View style={[styles.filtersIconWrap, { backgroundColor: colors.accentOrange }]}>
            <Filter size={14} color={colors.white} strokeWidth={2.2} />
          </View>
          <View style={styles.filtersTitleTextWrap}>
            <Text variant="bodySmall" weight="semibold">
              {copy?.labels?.filters}
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              {copy?.labels?.filtersHint}
            </Text>
          </View>
        </View>

        <View style={[styles.actionsRow, { flexDirection: getRowDirection(isRTL) }]}>
          {activeFiltersCount ? (
            <Chip label={`${copy?.labels?.activeFilters}: ${activeFiltersCount}`} />
          ) : null}
          <Button size="sm" variant="ghost" onPress={onReset}>
            {copy?.actions?.clearFilters}
          </Button>
        </View>
      </View>

      <ActivityChips
        items={activityOptions}
        selectedId={selectedActivityId}
        onSelect={onSelectActivity}
        allLabel={allSportsLabel}
        getLabel={(item) => item.label}
      />

      <View style={styles.inlineFieldsRow}>
        <View style={styles.dateFieldWrap}>
          <DatePickerField
            label={copy?.labels?.date}
            value={selectedDate}
            onChange={onSelectDate}
            minDate={new Date()}
            placeholder="dd/mm/yyyy"
          />
        </View>

        <View style={[styles.playersFieldWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Users size={14} color={colors.textMuted} strokeWidth={2.2} />
          <TextInput
            value={playersInput}
            onChangeText={handlePlayersChange}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={2}
            placeholder={copy?.labels?.players}
            placeholderTextColor={colors.textMuted}
            style={[styles.playersInput, { color: colors.textPrimary }]}
            textAlign="left"
          />
        </View>

        <View style={[styles.locationFieldWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <MapPin size={14} color={colors.textMuted} strokeWidth={2.2} />
          <TextInput
            value={selectedLocation}
            onChangeText={onSelectLocation}
            placeholder={copy?.labels?.locationPlaceholder}
            placeholderTextColor={colors.textMuted}
            style={[
              styles.locationInput,
              { color: colors.textPrimary, textAlign: locale === 'ar' ? 'right' : 'left' },
            ]}
          />
        </View>

        <Button
          size="sm"
          onPress={onSearch}
          style={styles.searchButton}
          leadingIcon={<Search size={14} color={colors.white} strokeWidth={2.2} />}
        >
          {copy?.actions?.search}
        </Button>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onToggleAdvanced}
        style={({ pressed }) => [
          styles.advancedToggle,
          { flexDirection: getRowDirection(isRTL), opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text variant="caption" color={colors.textSecondary}>
          {showAdvanced ? copy?.actions?.hideFilters : copy?.actions?.showFilters}
        </Text>
        <ChevronDown
          size={14}
          color={colors.textMuted}
          strokeWidth={2.2}
          style={showAdvanced ? styles.chevronExpanded : null}
        />
      </Pressable>

      {showAdvanced ? (
        <View style={styles.advancedWrap}>
          <View style={[styles.advancedLabelRow, { flexDirection: getRowDirection(isRTL) }]}>
            <CalendarDays size={12} color={colors.textMuted} strokeWidth={2.2} />
            <Text variant="caption" color={colors.textSecondary}>
              {copy?.labels?.chooseDuration}
            </Text>
          </View>
          <View style={[styles.durationChipsWrap, { flexDirection: getRowDirection(isRTL) }]}>
            <Chip
              label={copy?.tabs?.all}
              selected={!selectedDurationId}
              onPress={() => onSelectDuration?.('')}
            />
            {durationOptions.map((duration) => (
              <Chip
                key={duration.id}
                label={duration.label}
                selected={selectedDurationId === duration.id}
                onPress={() =>
                  onSelectDuration?.(selectedDurationId === duration.id ? '' : duration.id)
                }
              />
            ))}
          </View>
        </View>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  primaryRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  filtersTitleWrap: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  filtersIconWrap: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersTitleTextWrap: {
    flex: 1,
    gap: 2,
  },
  actionsRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  inlineFieldsRow: {
    gap: spacing.sm,
  },
  dateFieldWrap: {
    width: '100%',
  },
  playersFieldWrap: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  playersInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  locationFieldWrap: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  locationInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  searchButton: {
    alignSelf: 'flex-end',
  },
  advancedToggle: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  advancedWrap: {
    gap: spacing.xs,
  },
  advancedLabelRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  durationChipsWrap: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
