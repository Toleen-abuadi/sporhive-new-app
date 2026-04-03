import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';

const OUTER_PADDING = 4;

export function SegmentedToggle({ value, onChange, options = [], disabled = false, style }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const [layoutWidth, setLayoutWidth] = useState(0);
  const translate = useRef(new Animated.Value(0)).current;

  const count = Math.max(1, options.length);
  const innerWidth = Math.max(0, layoutWidth - OUTER_PADDING * 2);
  const indicatorWidth = innerWidth / count;

  const selectedIndex = useMemo(() => {
    const index = options.findIndex((item) => item.value === value);
    return index < 0 ? 0 : index;
  }, [options, value]);

  useEffect(() => {
    if (!layoutWidth || !options.length) return;

    const target = isRTL
      ? innerWidth - indicatorWidth * (selectedIndex + 1)
      : indicatorWidth * selectedIndex;

    Animated.spring(translate, {
      toValue: target,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
      mass: 0.9,
    }).start();
  }, [indicatorWidth, innerWidth, isRTL, layoutWidth, options.length, selectedIndex, translate]);

  return (
    <View
      onLayout={(event) => setLayoutWidth(event.nativeEvent.layout.width)}
      style={[
        styles.container,
        style,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          {
            width: indicatorWidth,
            backgroundColor: colors.accentOrange,
            transform: [{ translateX: translate }],
          },
        ]}
      />

      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (disabled) return;
              onChange?.(option.value);
            }}
            style={styles.item}
            accessibilityRole="button"
            accessibilityState={{ disabled, selected: active }}
          >
            <Text
              variant="bodySmall"
              weight={active ? 'bold' : 'semibold'}
              style={{
                color: active ? colors.white : colors.textSecondary,
              }}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
    padding: OUTER_PADDING,
  },
  indicator: {
    position: 'absolute',
    top: OUTER_PADDING,
    bottom: OUTER_PADDING,
    left: OUTER_PADDING,
    borderRadius: borderRadius.pill,
  },
  item: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});
