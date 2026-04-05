import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';

export function PortalSkeletonBlock({ height = 12, width = '100%', radius = borderRadius.md, style }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.72,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 520,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.skeletonBase || colors.surfaceSoft,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function PortalSkeletonCard({ rows = [14, 14, 14], style }) {
  return (
    <View style={[styles.card, style]}>
      {rows.map((height, index) => (
        <PortalSkeletonBlock
          key={`${height}-${index}`}
          height={height}
          width={index === rows.length - 1 ? '64%' : '100%'}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignSelf: 'flex-start',
  },
  card: {
    gap: spacing.sm,
    width: '100%',
  },
});
