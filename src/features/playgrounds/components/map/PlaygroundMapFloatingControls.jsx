import { StyleSheet, View } from 'react-native';
import { Compass, LocateFixed, Search } from 'lucide-react-native';
import { SporHiveMapPermissionButton } from '../../../../components/maps';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing } from '../../../../theme/tokens';
import { getRowDirection } from '../../../../utils/rtl';

export function PlaygroundMapFloatingControls({
  copy,
  isRTL = false,
  showSearchThisArea = false,
  onSearchThisArea,
  onUseMyLocation,
  onFitToResults,
  locating = false,
  locationDenied = false,
  onOpenLocationSettings,
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.root} pointerEvents="box-none">
      {showSearchThisArea ? (
        <SporHiveMapPermissionButton
          onPress={onSearchThisArea}
          leadingIcon={<Search size={15} color={colors.textPrimary} strokeWidth={2.2} />}
          accessibilityLabel={copy?.actions?.searchThisArea}
        >
          {copy?.actions?.showResultsInArea || copy?.actions?.searchThisArea}
        </SporHiveMapPermissionButton>
      ) : null}

      <View style={[styles.controlsRow, { flexDirection: getRowDirection(isRTL) }]}>
        <SporHiveMapPermissionButton
          onPress={onUseMyLocation}
          loading={locating}
          leadingIcon={<LocateFixed size={15} color={colors.textPrimary} strokeWidth={2.2} />}
          accessibilityLabel={copy?.actions?.useMyLocation}
        >
          {locationDenied ? copy?.actions?.retry : copy?.actions?.useMyLocation}
        </SporHiveMapPermissionButton>

        <SporHiveMapPermissionButton
          onPress={locationDenied ? onOpenLocationSettings : onFitToResults}
          leadingIcon={<Compass size={15} color={colors.textPrimary} strokeWidth={2.2} />}
          accessibilityLabel={
            locationDenied
              ? copy?.actions?.openSettings
              : copy?.actions?.fitResults
          }
        >
          {locationDenied ? copy?.actions?.openSettings : copy?.actions?.fitResults}
        </SporHiveMapPermissionButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    gap: spacing.sm,
  },
  controlsRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

