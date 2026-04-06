import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { X } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import {
  formatAcademyAgeRange,
  formatAcademyFee,
  formatAcademyLocation,
  formatAcademySports,
} from '../utils/academyDiscovery.formatters';

function AcademyCompareColumn({ academy, copy, locale, onView, onJoin }) {
  const { colors } = useTheme();

  if (!academy) return null;

  const locationText = formatAcademyLocation({
    city: academy.city,
    country: academy.country,
    address: academy.address,
  });
  const sportsText = formatAcademySports(academy.sportTypes, locale, 5);
  const ageText = formatAcademyAgeRange(academy.agesFrom, academy.agesTo, locale);
  const feeText = formatAcademyFee(academy.subscriptionFeeAmount, {
    locale,
    feeType: academy.subscriptionFeeType,
  });
  const rating = Number(academy.rating || 0);

  return (
    <Surface variant="soft" padding="md" style={styles.column}>
      <Text variant="body" weight="bold" numberOfLines={2}>
        {academy.name}
      </Text>

      <View style={styles.rows}>
        <Text variant="caption" color={colors.textSecondary}>
          {copy?.card?.location}: {locationText || copy?.labels?.noData}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {copy?.labels?.sports}: {sportsText || copy?.labels?.noData}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {copy?.labels?.ageRange}: {ageText || copy?.labels?.noData}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {copy?.card?.price}: {feeText || copy?.labels?.noData}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {copy?.card?.rating}: {rating > 0 ? rating.toFixed(1) : copy?.labels?.noData}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button size="sm" variant="secondary" onPress={() => onView?.(academy)} fullWidth>
          {copy?.actions?.viewDetails}
        </Button>
        <Button size="sm" onPress={() => onJoin?.(academy)} fullWidth>
          {copy?.actions?.joinNow}
        </Button>
      </View>
    </Surface>
  );
}

export function AcademyCompareModal({
  open = false,
  onClose,
  pinnedAcademy,
  compareAcademy,
  copy,
  locale = 'en',
  onView,
  onJoin,
}) {
  const { colors } = useTheme();

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdropWrap}>
        <Pressable
          style={[
            styles.backdrop,
            {
              backgroundColor: colors.overlayStrong || 'rgba(0,0,0,0.5)',
            },
          ]}
          onPress={onClose}
        />

        <Surface variant="elevated" padding="none" style={styles.sheet}>
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}> 
            <Text variant="h3" weight="bold">
              {copy?.compare?.title || 'Compare Academies'}
            </Text>

            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={18} color={colors.textSecondary} strokeWidth={2.4} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <AcademyCompareColumn
              academy={pinnedAcademy}
              copy={copy}
              locale={locale}
              onView={onView}
              onJoin={onJoin}
            />

            <AcademyCompareColumn
              academy={compareAcademy}
              copy={copy}
              locale={locale}
              onView={onView}
              onJoin={onJoin}
            />
          </ScrollView>
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '86%',
    overflow: 'hidden',
  },
  sheetHeader: {
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  column: {
    gap: spacing.sm,
  },
  rows: {
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.xs,
  },
});
