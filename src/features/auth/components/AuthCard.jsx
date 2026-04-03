import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, shadow, spacing } from '../../../theme/tokens';
import { withAlpha } from '../../../theme/colors';

export function AuthCard({ children, style }) {
  const { colors, isDark } = useTheme();

  const gradient = isDark
    ? [colors.surfaceElevated, withAlpha(colors.surface, 0.96)]
    : [colors.surface, withAlpha(colors.white, 0.96)];

  return (
    <View style={[styles.wrapper, style]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            borderColor: withAlpha(colors.border, 0.8),
            shadowColor: colors.black,
          },
        ]}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadow.md,
  },
});
