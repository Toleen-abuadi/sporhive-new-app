import { StyleSheet, View } from 'react-native';
import { Surface } from '../../../components/ui/Surface';
import { spacing } from '../../../theme/tokens';
import { PortalSectionHeader } from './PortalSectionHeader';

export function PortalSectionCard({
  title,
  subtitle,
  right,
  actionLabel,
  onActionPress,
  children,
  footer,
  style,
  contentStyle,
}) {
  return (
    <Surface variant="elevated" style={[styles.card, style]}>
      {(title || subtitle) ? (
        <PortalSectionHeader
          title={title}
          subtitle={subtitle}
          right={right}
          actionLabel={actionLabel}
          onActionPress={onActionPress}
        />
      ) : null}

      <View style={[styles.content, contentStyle]}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    gap: spacing.md,
  },
  content: {
    gap: spacing.sm,
  },
  footer: {
    marginTop: spacing.xs,
  },
});

