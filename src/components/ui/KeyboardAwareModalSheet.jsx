import { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, spacing } from '../../theme/tokens';

const SHEET_MIN_HEIGHT = 240;
const SHEET_MAX_RATIO_DEFAULT = 0.84;

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event?.endCoordinates?.height || 0);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  return keyboardHeight;
}

export function KeyboardAwareModalSheet({
  children,
  backgroundColor,
  borderColor,
  maxHeightRatio = SHEET_MAX_RATIO_DEFAULT,
  keyboardVerticalOffset = 0,
  style,
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();

  const maxHeight = useMemo(() => {
    const preferred = windowHeight * maxHeightRatio;
    const viewportLimited =
      windowHeight - insets.top - keyboardHeight - spacing.md;
    return Math.max(SHEET_MIN_HEIGHT, Math.min(preferred, viewportLimited));
  }, [insets.top, keyboardHeight, maxHeightRatio, windowHeight]);

  const bottomPadding = Math.max(spacing.md, insets.bottom + spacing.xs);

  return (
    <View style={styles.backdrop}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor,
              borderColor,
              maxHeight,
              paddingBottom: bottomPadding,
            },
            style,
          ]}
        >
          {children}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardWrap: {
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
});
