import { useMemo, useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../../../components/ui/Text';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { digitsOnly } from '../utils/phone';

export function OTPInput({ value, onChange, length = 6, error, style }) {
  const { colors } = useTheme();
  const inputRef = useRef(null);

  const digits = useMemo(() => {
    const clean = digitsOnly(value).slice(0, length);
    return Array.from({ length }, (_, index) => clean[index] || '');
  }, [length, value]);

  const activeIndex = Math.min(digitsOnly(value).length, length - 1);

  const onChangeText = (text) => {
    const clean = digitsOnly(text).slice(0, length);
    onChange?.(clean);
  };

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={style}>
      <View style={styles.row}>
        {digits.map((digit, index) => {
          const isFocused = index === activeIndex;
          return (
            <View
              key={`otp-${index}`}
              style={[
                styles.box,
                {
                  borderColor: error
                    ? colors.error
                    : isFocused
                    ? colors.accentOrange
                    : colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Text variant="h3" weight="bold">
                {digit || ' '}
              </Text>
            </View>
          );
        })}
      </View>

      <TextInput
        ref={inputRef}
        value={String(value || '')}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={length}
        style={styles.hiddenInput}
      />

      {error ? (
        <Text variant="caption" color={colors.error} style={styles.error}>
          {error}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  box: {
    width: 44,
    height: 54,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenInput: {
    width: 1,
    height: 1,
    position: 'absolute',
    opacity: 0,
  },
  error: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
