import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import { formatOrderStatusLabel } from '../utils/playerPortal.formatters';
import {
  getUniformStatusStepIndex,
  normalizeUniformStatus,
  UNIFORM_STATUS_FLOW,
} from '../utils/playerPortal.uniform';

export function UniformStatusTimeline({ status, t, style }) {
  const { colors } = useTheme();
  const { isRTL, locale } = useI18n();
  const translate = typeof t === 'function' ? t : undefined;
  const activeIndex = getUniformStatusStepIndex(status);
  const normalized = normalizeUniformStatus(status);

  return (
    <View style={[styles.container, style]}>
      {UNIFORM_STATUS_FLOW.map((step, index) => {
        const done = index <= activeIndex;
        const isCurrent = step === normalized;
        return (
          <View key={step} style={styles.stepRow}>
            <View style={[styles.rowTop, { flexDirection: getRowDirection(isRTL) }]}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: done ? colors.accentOrange : colors.borderStrong,
                    borderColor: done ? colors.accentOrange : colors.borderStrong,
                    width: isCurrent ? 11 : 9,
                    height: isCurrent ? 11 : 9,
                  },
                ]}
              />
              {index < UNIFORM_STATUS_FLOW.length - 1 ? (
                <View
                  style={[
                    styles.line,
                    {
                      backgroundColor: index < activeIndex ? colors.accentOrange : colors.border,
                    },
                  ]}
                />
              ) : null}
            </View>
            <Text variant="caption" color={done ? colors.textPrimary : colors.textMuted}>
              {formatOrderStatusLabel(step, {
                t: translate,
                locale,
                fallback: '-',
              })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  stepRow: {
    gap: spacing.xs,
  },
  rowTop: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    borderRadius: borderRadius.pill,
    borderWidth: 1,
  },
  line: {
    flex: 1,
    height: 4,
    borderRadius: borderRadius.pill,
  },
});
