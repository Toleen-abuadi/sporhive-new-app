import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';

export function AuthTextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType = 'default',
  autoCapitalize = 'none',
  secureTextEntry = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  editable = true,
  textContentType,
  style,
  inputStyle,
  onBlur,
  onFocus,
  maxLength,
}) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry);

  const borderColor = useMemo(() => {
    if (error) return colors.error;
    if (focused) return colors.accentOrange;
    return colors.border;
  }, [colors.accentOrange, colors.border, colors.error, error, focused]);

  const handleFocus = (event) => {
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event) => {
    setFocused(false);
    onBlur?.(event);
  };

  return (
    <View style={style}>
      {label ? (
        <Text variant="caption" color={colors.textSecondary} style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputWrap,
          {
            borderColor,
            backgroundColor: colors.surface,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            opacity: editable ? 1 : 0.7,
          },
        ]}
      >
        {leftIcon ? (
          <Feather
            name={leftIcon}
            size={16}
            color={colors.textMuted}
            style={isRTL ? styles.leadingRTL : styles.leadingLTR}
          />
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={hidden}
          editable={editable}
          textContentType={textContentType}
          maxLength={maxLength}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              textAlign: isRTL && keyboardType === 'default' ? 'right' : 'left',
              writingDirection: isRTL && keyboardType === 'default' ? 'rtl' : 'ltr',
            },
            inputStyle,
          ]}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((prev) => !prev)} style={styles.action}>
            <Feather name={hidden ? 'eye-off' : 'eye'} size={16} color={colors.textMuted} />
          </Pressable>
        ) : rightIcon ? (
          <Pressable onPress={onRightIconPress} style={styles.action}>
            <Feather name={rightIcon} size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color={colors.error} style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing.xs,
  },
  inputWrap: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 0,
  },
  leadingLTR: {
    marginRight: spacing.xs,
  },
  leadingRTL: {
    marginLeft: spacing.xs,
  },
  action: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    marginTop: spacing.xs,
  },
});
