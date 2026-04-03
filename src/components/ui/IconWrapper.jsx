import { StyleSheet, View } from 'react-native';
import { useI18n } from '../../hooks/useI18n';

export function IconWrapper({
  icon: Icon,
  size = 20,
  color,
  strokeWidth = 2,
  mirrorInRTL = false,
  style,
}) {
  const { isRTL } = useI18n();
  const shouldMirror = mirrorInRTL && isRTL;

  return (
    <View style={[shouldMirror ? styles.mirror : null, style]}>
      <Icon size={size} color={color} strokeWidth={strokeWidth} />
    </View>
  );
}

const styles = StyleSheet.create({
  mirror: {
    transform: [{ scaleX: -1 }],
  },
});
