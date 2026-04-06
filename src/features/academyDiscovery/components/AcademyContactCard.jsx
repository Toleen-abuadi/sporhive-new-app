import { Linking, StyleSheet, View } from 'react-native';
import { Globe, Mail, MapPin, Phone } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import { buildAcademyMapHref } from '../utils/academyDiscovery.maps';

const normalizeUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw) || /^mailto:/i.test(raw) || /^tel:/i.test(raw)) {
    return raw;
  }

  return `https://${raw}`;
};

const openExternalUrl = async (value) => {
  const url = normalizeUrl(value);
  if (!url) return;

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) return;
    await Linking.openURL(url);
  } catch {
    // ignore safely
  }
};

export function AcademyContactCard({ academy, copy, style }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  if (!academy) return null;

  const address = [academy.address, academy.city, academy.country]
    .filter(Boolean)
    .join(', ');
  const mapHref = buildAcademyMapHref(academy);
  const phones = (academy.contactPhones || []).filter(Boolean);
  const email = academy.contactEmail || '';
  const website = academy.website || '';

  return (
    <View style={[styles.container, style]}>
      {address ? (
        <View style={[styles.row, { flexDirection: getRowDirection(isRTL) }]}>
          <MapPin size={15} color={colors.textMuted} strokeWidth={2.2} />
          <Text variant="bodySmall" color={colors.textSecondary} style={styles.rowText}>
            {copy?.labels?.address}: {address}
          </Text>
        </View>
      ) : (
        <Text variant="bodySmall" color={colors.textMuted}>
          {copy?.template?.noAddress}
        </Text>
      )}

      {phones.length ? (
        <View style={styles.block}>
          {phones.map((phone) => (
            <View
              key={`phone-${phone}`}
              style={[styles.row, { flexDirection: getRowDirection(isRTL) }]}
            >
              <Phone size={15} color={colors.textMuted} strokeWidth={2.2} />
              <Text
                variant="bodySmall"
                color={colors.textSecondary}
                style={[styles.rowText]}
              >
                {phone}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {email ? (
        <View style={[styles.row, { flexDirection: getRowDirection(isRTL) }]}>
          <Mail size={15} color={colors.textMuted} strokeWidth={2.2} />
          <Text variant="bodySmall" color={colors.textSecondary} style={styles.rowText}>
            {email}
          </Text>
        </View>
      ) : null}

      {website ? (
        <View style={[styles.row, { flexDirection: getRowDirection(isRTL) }]}>
          <Globe size={15} color={colors.textMuted} strokeWidth={2.2} />
          <Text variant="bodySmall" color={colors.textSecondary} style={styles.rowText}>
            {website.replace(/^https?:\/\//i, '')}
          </Text>
        </View>
      ) : null}

      <View style={[styles.actionsRow, { flexDirection: getRowDirection(isRTL) }]}>
        {mapHref ? (
          <Button
            size="sm"
            variant="secondary"
            onPress={() => openExternalUrl(mapHref)}
            style={styles.actionButton}
          >
            {copy?.actions?.getDirections}
          </Button>
        ) : null}
        {phones[0] ? (
          <Button
            size="sm"
            variant="secondary"
            onPress={() => openExternalUrl(`tel:${phones[0]}`)}
            style={styles.actionButton}
          >
            {copy?.actions?.call}
          </Button>
        ) : null}
        {email ? (
          <Button
            size="sm"
            variant="secondary"
            onPress={() => openExternalUrl(`mailto:${email}`)}
            style={styles.actionButton}
          >
            {copy?.actions?.email}
          </Button>
        ) : null}
        {website ? (
          <Button
            size="sm"
            variant="secondary"
            onPress={() => openExternalUrl(website)}
            style={styles.actionButton}
          >
            {copy?.actions?.website}
          </Button>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  block: {
    gap: spacing.xs,
  },
  row: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowText: {
    flex: 1,
  },
  ltrText: {
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  actionsRow: {
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionButton: {
    minWidth: 96,
  },
});
