import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, RotateCcw, Trash2 } from 'lucide-react-native';
import { useI18n } from '../../hooks/useI18n';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, spacing } from '../../theme/tokens';
import { Button } from './Button';
import { Text } from './Text';

const IMAGE_MEDIA_TYPES = ['images'];

export function ImagePickerField({
  label = '',
  subtitle = '',
  imageUri = '',
  emptyLabel = '',
  pickLabel = '',
  replaceLabel = '',
  removeLabel = '',
  showRemove = false,
  disabled = false,
  error = '',
  onPick,
  onRemove,
  onError,
}) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const [isPicking, setIsPicking] = useState(false);

  const launchPicker = async () => {
    if (disabled || isPicking) return;

    setIsPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission?.granted) {
        onError?.({
          code: 'MEDIA_PERMISSION_DENIED',
          message: t('playerPortal.profile.errors.imagePermission'),
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: IMAGE_MEDIA_TYPES,
        allowsEditing: true,
        quality: 0.9,
        exif: false,
        base64: true,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        onError?.({
          code: 'MEDIA_EMPTY',
          message: t('playerPortal.profile.errors.imageSelect'),
        });
        return;
      }

      onPick?.({
        uri: asset.uri,
        mimeType: asset.mimeType || asset.type || 'image/jpeg',
        fileSize: asset.fileSize || asset.size || 0,
        base64: asset.base64 || '',
      });
    } catch (reason) {
      onError?.({
        code: 'MEDIA_PICK_FAILED',
        message: reason?.message || t('playerPortal.profile.errors.imageSelect'),
      });
    } finally {
      setIsPicking(false);
    }
  };

  const hasImage = Boolean(String(imageUri || '').trim());

  return (
    <View style={styles.container}>
      {label ? (
        <Text variant="caption" color={colors.textSecondary}>
          {label}
        </Text>
      ) : null}

      {subtitle ? (
        <Text variant="caption" color={colors.textMuted}>
          {subtitle}
        </Text>
      ) : null}

      {hasImage ? (
        <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
      ) : (
        <View style={[styles.preview, { backgroundColor: colors.surfaceSoft }]}>
          <Text variant="caption" color={colors.textMuted}>
            {emptyLabel || t('playerPortal.profile.labels.noImage')}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <Button
          fullWidth
          variant="secondary"
          loading={isPicking}
          disabled={disabled}
          onPress={launchPicker}
          leadingIcon={
            hasImage ? (
              <RotateCcw size={14} color={colors.textPrimary} strokeWidth={2.2} />
            ) : (
              <Camera size={14} color={colors.textPrimary} strokeWidth={2.2} />
            )
          }
        >
          {hasImage
            ? replaceLabel || t('playerPortal.profile.actions.replaceImage')
            : pickLabel || t('playerPortal.profile.actions.changeImage')}
        </Button>

        {hasImage && showRemove ? (
          <Button
            fullWidth
            variant="secondary"
            disabled={disabled}
            onPress={onRemove}
            leadingIcon={<Trash2 size={14} color={colors.error} strokeWidth={2.2} />}
          >
            {removeLabel || t('playerPortal.profile.actions.clearImage')}
          </Button>
        ) : null}
      </View>

      {error ? (
        <Text variant="caption" color={colors.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    gap: spacing.sm,
  },
});
