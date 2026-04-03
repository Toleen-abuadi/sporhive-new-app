import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { withAlpha } from '../../../theme/colors';
import { borderRadius, spacing } from '../../../theme/tokens';

const logoSource = require('../../../../assets/images/logo.png');

export function AuthHeader({ title, subtitle, onBack }) {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();

  return (
    <View style={styles.wrap}>
      <View style={[styles.topRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={[
              styles.backBtn,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('common.actions.back')}
          >
            <Feather
              name={isRTL ? 'arrow-right' : 'arrow-left'}
              size={18}
              color={colors.textPrimary}
            />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}

        <LanguageSwitch compact />
      </View>

      <View style={styles.logoBlock}>
        <View
          style={[
            styles.logoWrap,
            {
              backgroundColor: withAlpha(colors.accentOrange, 0.15),
              borderColor: withAlpha(colors.accentOrange, 0.24),
            },
          ]}
        >
          <Image source={logoSource} resizeMode="contain" style={styles.logo} />
        </View>
      </View>

      <Text variant="h2" weight="bold" align="center">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="bodySmall" color={colors.textSecondary} align="center" style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  topRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 40,
    height: 40,
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoWrap: {
    width: 74,
    height: 74,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 44,
    height: 44,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
});
