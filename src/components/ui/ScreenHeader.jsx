import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useI18n } from '../../hooks/useI18n';
import { useTheme } from '../../hooks/useTheme';
import { getRowDirection } from '../../utils/rtl';
import { borderRadius, spacing } from '../../theme/tokens';
import { IconWrapper } from './IconWrapper';
import { Text } from './Text';

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  style,
  backAccessibilityLabel,
}) {
  const { colors } = useTheme();
  const { isRTL, t } = useI18n();

  return (
    <View style={[styles.wrapper, style]}>
      <View style={[styles.topRow, { flexDirection: getRowDirection(isRTL) }]}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel || t('common.actions.back')}
            style={({ pressed }) => [
              styles.backButton,
              {
                borderColor: colors.border,
                backgroundColor: pressed ? colors.surfaceSoft : colors.surface,
              },
            ]}
          >
            <IconWrapper
              icon={ChevronLeft}
              size={18}
              color={colors.textPrimary}
              mirrorInRTL
            />
          </Pressable>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}

        <View style={styles.titleWrap}>
          <Text variant="h2" weight="bold" align="center">
            {title}
          </Text>
          {subtitle ? (
            <Text
              variant="bodySmall"
              color={colors.textSecondary}
              align="center"
              style={styles.subtitle}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.rightSlot}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.xl,
  },
  topRow: {
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  titleWrap: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  rightSlot: {
    minWidth: 40,
    alignItems: 'center',
  },
});
