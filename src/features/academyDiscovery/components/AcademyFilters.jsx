import { useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import { normalizeNumericInput } from '../../../utils/numbering';
import {
  ACADEMY_DISCOVERY_SORT,
  normalizeAcademySort,
} from '../utils/academyDiscovery.statuses';
import { cleanString } from '../utils/academyDiscovery.normalizers';

const resolveSportOption = (item) => {
  if (!item) return null;
  if (typeof item === 'string') {
    const value = cleanString(item);
    if (!value) return null;
    return { value, label: value };
  }

  const value = cleanString(item.value || item.id || item.key || item.sport);
  if (!value) return null;

  const key = cleanString(value).toLowerCase();
  return {
    key,
    value,
    label: cleanString(item.label || item.name || value),
  };
};

const resolveCityOption = (item) => {
  if (!item) return null;
  if (typeof item === 'string') {
    const value = cleanString(item);
    if (!value) return null;
    return {
      value,
      label: value,
    };
  }

  const value = cleanString(item.value || item.city || item.label);
  if (!value) return null;

  return {
    value,
    label: cleanString(item.label || value),
  };
};

const resolveAgeRangeOption = (item) => {
  if (!item) return null;

  const key = cleanString(item.key || `${item.from || ''}-${item.to || ''}`);
  if (!key) return null;

  const from = cleanString(item.from);
  const to = cleanString(item.to);

  return {
    key,
    from,
    to,
    label: cleanString(item.label) || `${from || '?'}-${to || '?'}`,
  };
};

const resolveTextStyle = (isRTL) => ({
  textAlign: isRTL ? 'right' : 'left',
  writingDirection: isRTL ? 'rtl' : 'ltr',
});

const formatAgeRangeLabel = ({ minAge, maxAge, isRTL, copy }) => {
  const minValue = cleanString(minAge);
  const maxValue = cleanString(maxAge);
  const ageUnitAr = cleanString(copy?.filters?.ageUnitAr || 'سنة');
  const yearsEn = cleanString(copy?.filters?.ageYears || 'years');

  if (!minValue && !maxValue) return '';
  if (minValue && maxValue) {
    if (isRTL) return `من ${minValue} إلى ${maxValue} ${ageUnitAr}`;
    return `${minValue}-${maxValue} ${yearsEn}`;
  }
  if (minValue) {
    if (isRTL) return `من ${minValue} ${ageUnitAr}`;
    return `${cleanString(copy?.filters?.ageFromLabel || 'From')} ${minValue}`;
  }
  if (isRTL) return `حتى ${maxValue} ${ageUnitAr}`;
  return `${cleanString(copy?.filters?.ageUpToLabel || 'Up to')} ${maxValue}`;
};

export function AcademyFilters({
  filters,
  onChange,
  sportOptions = [],
  cityOptions = [],
  ageRangeOptions = [],
  dynamicTogglesMeta = {},
  copy,
  onApply,
}) {
  const { colors, isDark } = useTheme();
  const { isRTL } = useI18n();
  const normalizedSort = normalizeAcademySort(filters?.sort);
  const textStyle = resolveTextStyle(isRTL);
  const rowDirection = getRowDirection(isRTL);

  const availableSports = useMemo(
    () => {
      const map = new Map();
      sportOptions
        .map(resolveSportOption)
        .filter(Boolean)
        .forEach((item) => {
          if (map.has(item.key)) return;
          map.set(item.key, item);
        });
      return [...map.values()];
    },
    [sportOptions]
  );

  const availableCities = useMemo(() => {
    const source = cityOptions.map(resolveCityOption).filter(Boolean);
    const map = new Map();
    source.forEach((item) => {
      const key = item.value.toLowerCase();
      if (!map.has(key)) {
        map.set(key, item);
      }
    });

    return [...map.values()];
  }, [cityOptions]);

  const availableAgeRanges = useMemo(() => {
    const map = new Map();
    ageRangeOptions
      .map(resolveAgeRangeOption)
      .filter(Boolean)
      .forEach((item) => {
        if (map.has(item.key)) return;
        map.set(item.key, item);
      });

    return [...map.values()];
  }, [ageRangeOptions]);

  const sortOptions = [
    {
      value: ACADEMY_DISCOVERY_SORT.RECOMMENDED,
      label: copy?.filters?.sortRecommended,
    },
    {
      value: ACADEMY_DISCOVERY_SORT.NEWEST,
      label: copy?.filters?.sortNewest,
    },
    {
      value: ACADEMY_DISCOVERY_SORT.NEAREST,
      label: copy?.filters?.sortNearest,
    },
  ];

  const updateField = (key, value) => {
    onChange?.({
      ...filters,
      [key]: value,
    });
  };

  const applyAgeRangeOption = (item) => {
    const selectedKey = cleanString(item?.key);
    const isSame = cleanString(filters?.age_group) === selectedKey;

    if (!selectedKey || isSame) {
      onChange?.({
        ...filters,
        age_group: '',
        age_from: '',
        age_to: '',
      });
      return;
    }

    onChange?.({
      ...filters,
      age_group: selectedKey,
      age_from: cleanString(item?.from),
      age_to: cleanString(item?.to),
    });
  };

  const updateAge = (field, nextValue) => {
    const digitsOnly = normalizeNumericInput(nextValue).replace(/[^\d]/g, '').slice(0, 2);
    onChange?.({
      ...filters,
      age_group: '',
      [field]: digitsOnly,
    });
  };

  const resetFilters = () => {
    onChange?.({
      q: '',
      sport: '',
      city: '',
      age_group: '',
      age_from: '',
      age_to: '',
      registration_open: undefined,
      is_pro: undefined,
      sort: ACADEMY_DISCOVERY_SORT.RECOMMENDED,
    });
    onApply?.();
  };

  const registrationCount =
    Number(dynamicTogglesMeta?.registrationOpenCount ?? dynamicTogglesMeta?.registrationEnabledCount) || 0;
  const proCount = Number(dynamicTogglesMeta?.proCount) || 0;
  const registrationLabel = `${copy?.filters?.registrationOpen || copy?.filters?.registrationEnabled || 'Registration open'}${
    registrationCount > 0 ? ` (${registrationCount})` : ''
  }`;
  const proOnlyLabel = `${copy?.filters?.proOnly || 'PRO only'}${
    proCount > 0 ? ` (${proCount})` : ''
  }`;

  return (
    <Surface variant="soft" padding="md" style={styles.container}>
      <View
        style={[
          styles.searchWrap,
          {
            borderColor: colors.inputBorder || colors.border,
            backgroundColor: colors.inputBackground || colors.surface,
            flexDirection: rowDirection,
          },
        ]}
      >
        <Search size={16} color={colors.textMuted} />
        <TextInput
          value={cleanString(filters?.q)}
          onChangeText={(value) => updateField('q', value)}
          placeholder={copy?.filters?.searchPlaceholder}
          placeholderTextColor={colors.inputPlaceholder || colors.textMuted}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          autoCapitalize="none"
          style={[
            styles.searchInput,
            {
              color: colors.inputText || colors.textPrimary,
              ...textStyle,
            },
          ]}
        />
      </View>

      <View style={styles.block}>
        <Text variant="caption" color={colors.textSecondary} style={textStyle}>
          {copy?.filters?.sport}
        </Text>
        <View style={[styles.rowWrap, { flexDirection: rowDirection }]}>
          <Chip
            label={copy?.filters?.allSports}
            selected={!filters?.sport}
            onPress={() => updateField('sport', '')}
          />
          {availableSports.map((sport) => (
            <Chip
              key={sport.value}
              label={sport.label}
              selected={filters?.sport === sport.value}
              onPress={() =>
                updateField(
                  'sport',
                  filters?.sport === sport.value ? '' : sport.value
                )
              }
            />
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <Text variant="caption" color={colors.textSecondary} style={textStyle}>
          {copy?.filters?.city}
        </Text>
        <TextInput
          value={cleanString(filters?.city)}
          onChangeText={(value) => updateField('city', value)}
          placeholder={copy?.filters?.cityPlaceholder}
          placeholderTextColor={colors.inputPlaceholder || colors.textMuted}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          autoCapitalize="words"
          style={[
            styles.cityInput,
            {
              color: colors.inputText || colors.textPrimary,
              borderColor: colors.inputBorder || colors.border,
              backgroundColor: colors.inputBackground || colors.surface,
              ...textStyle,
            },
          ]}
        />

        {availableCities.length ? (
          <View style={[styles.rowWrap, { flexDirection: rowDirection }]}>
            {availableCities.map((city) => (
              <Chip
                key={city.value}
                label={city.label}
                selected={cleanString(filters?.city).toLowerCase() === city.value.toLowerCase()}
                onPress={() =>
                  updateField(
                    'city',
                    cleanString(filters?.city).toLowerCase() === city.value.toLowerCase()
                      ? ''
                      : city.value
                  )
                }
              />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.block}>
        <Text variant="caption" color={colors.textSecondary} style={textStyle}>
          {copy?.filters?.ageGroup || 'Age group'}
        </Text>

        {availableAgeRanges.length ? (
          <View style={[styles.rowWrap, { flexDirection: rowDirection }]}>
            {availableAgeRanges.map((item) => (
              <Chip
                key={item.key}
                label={item.label}
                selected={cleanString(filters?.age_group) === item.key}
                onPress={() => applyAgeRangeOption(item)}
              />
            ))}
          </View>
        ) : null}

        {(cleanString(filters?.age_from) || cleanString(filters?.age_to)) ? (
          <Text variant="caption" color={colors.textMuted} style={textStyle}>
            {formatAgeRangeLabel({
              minAge: filters?.age_from,
              maxAge: filters?.age_to,
              isRTL,
              copy,
            })}
          </Text>
        ) : null}

        <View style={[styles.ageRangeRow, { flexDirection: rowDirection }]}>
          <TextInput
            value={cleanString(filters?.age_from)}
            onChangeText={(value) => updateAge('age_from', value)}
            placeholder={copy?.filters?.ageFrom || 'From'}
            placeholderTextColor={colors.inputPlaceholder || colors.textMuted}
            keyboardAppearance={isDark ? 'dark' : 'light'}
            keyboardType="number-pad"
            style={[
              styles.ageInput,
              {
                color: colors.inputText || colors.textPrimary,
                borderColor: colors.inputBorder || colors.border,
                backgroundColor: colors.inputBackground || colors.surface,
                ...textStyle,
              },
            ]}
          />

          <TextInput
            value={cleanString(filters?.age_to)}
            onChangeText={(value) => updateAge('age_to', value)}
            placeholder={copy?.filters?.ageTo || 'To'}
            placeholderTextColor={colors.inputPlaceholder || colors.textMuted}
            keyboardAppearance={isDark ? 'dark' : 'light'}
            keyboardType="number-pad"
            style={[
              styles.ageInput,
              {
                color: colors.inputText || colors.textPrimary,
                borderColor: colors.inputBorder || colors.border,
                backgroundColor: colors.inputBackground || colors.surface,
                ...textStyle,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.block}>
        <View style={[styles.rowWrap, { flexDirection: rowDirection }]}>
          <Chip
            label={registrationLabel}
            selected={Boolean(filters?.registration_open)}
            onPress={() =>
              updateField(
                'registration_open',
                filters?.registration_open ? undefined : true
              )
            }
          />
          <Chip
            label={proOnlyLabel}
            selected={Boolean(filters?.is_pro)}
            onPress={() => updateField('is_pro', filters?.is_pro ? undefined : true)}
          />
        </View>
      </View>

      <View style={styles.block}>
        <Text variant="caption" color={colors.textSecondary} style={textStyle}>
          {copy?.filters?.sort}
        </Text>
        <View style={[styles.rowWrap, { flexDirection: rowDirection }]}>
          {sortOptions.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={normalizedSort === item.value}
              onPress={() => updateField('sort', item.value)}
            />
          ))}
        </View>
      </View>

      <View style={[styles.actionsRow, { flexDirection: rowDirection }]}>
        <Button size="sm" variant="ghost" onPress={resetFilters} style={styles.actionButton}>
          {copy?.actions?.clearFilters || copy?.actions?.resetFilters}
        </Button>

        <Button variant="secondary" size="sm" onPress={onApply} style={styles.actionButton}>
          {copy?.actions?.applyFilters || copy?.actions?.refresh}
        </Button>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  searchWrap: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 0,
  },
  block: {
    gap: spacing.xs,
  },
  rowWrap: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cityInput: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  ageRangeRow: {
    gap: spacing.sm,
  },
  ageInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionsRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
