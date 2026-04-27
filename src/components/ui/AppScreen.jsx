import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';

export function AppScreen({
  children,
  safe = true,
  scroll = false,
  keyboardAware = false,
  keyboardVerticalOffset = 0,
  centered = false,
  edges = ['top', 'bottom'],
  background = 'background',
  paddingHorizontal = spacing.lg,
  paddingTop = spacing.lg,
  paddingBottom = spacing.lg,
  style,
  contentStyle,
  contentContainerStyle,
  ...props
}) {
  const { colors } = useTheme();

  const resolvedBackground = colors[background] || background;
  const rootStyles = [styles.root, { backgroundColor: resolvedBackground }, style];

  const baseContentStyle = {
    paddingHorizontal,
    paddingTop,
    paddingBottom,
  };

  const centeredStyle = centered ? styles.centered : null;

  const content = scroll ? (
    <ScrollView
      style={styles.flex}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.scrollContent,
        baseContentStyle,
        centeredStyle,
        contentStyle,
        contentContainerStyle,
      ]}
      {...props}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, baseContentStyle, centeredStyle, contentStyle, contentContainerStyle]} {...props}>
      {children}
    </View>
  );

  const body = keyboardAware ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  if (!safe) {
    return <View style={rootStyles}>{body}</View>;
  }

  return (
    <SafeAreaView style={rootStyles} edges={edges}>
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  centered: {
    justifyContent: 'center',
  },
});
