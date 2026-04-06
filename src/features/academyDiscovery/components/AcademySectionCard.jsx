import { StyleSheet, View } from 'react-native';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../theme/tokens';

export function AcademySectionCard({
  title,
  subtitle,
  right,
  children,
  variant = 'elevated',
  padding = 'md',
  style,
}) {
  const { colors } = useTheme();

  return (
    <Surface variant={variant} padding={padding} style={[styles.section, style]}>
      {title || subtitle || right ? (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title ? (
              <Text variant="body" weight="bold">
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text variant="caption" color={colors.textSecondary}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </Surface>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
});
