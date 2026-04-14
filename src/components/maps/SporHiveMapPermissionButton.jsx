import { StyleSheet } from 'react-native';
import { Button } from '../ui/Button';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius } from '../../theme/tokens';

export function SporHiveMapPermissionButton({
  children,
  onPress,
  loading = false,
  disabled = false,
  leadingIcon,
  accessibilityLabel,
  style,
}) {
  const { colors } = useTheme();

  return (
    <Button
      size="sm"
      variant="secondary"
      loading={loading}
      disabled={disabled}
      onPress={onPress}
      leadingIcon={leadingIcon}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.button,
        {
          borderColor: colors.border,
          backgroundColor: colors.surfaceElevated,
        },
        style,
      ]}
    >
      {children}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 42,
    borderRadius: borderRadius.pill,
    alignSelf: 'flex-start',
  },
});

