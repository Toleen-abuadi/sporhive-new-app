import {
  Animated,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CircleAlert, CircleCheck, CircleX, Info, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../hooks/useI18n';
import { useTheme } from '../../hooks/useTheme';
import { getRowDirection } from '../../utils/rtl';
import { borderRadius, shadow, spacing } from '../../theme/tokens';
import { Text } from '../ui/Text';

const ToastContext = createContext(null);

const makeId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

function getIconComponent(variant) {
  switch (variant) {
    case 'success':
      return CircleCheck;
    case 'error':
      return CircleX;
    case 'warning':
      return CircleAlert;
    default:
      return Info;
  }
}

function getVariantColor(variant, colors) {
  switch (variant) {
    case 'success':
      return colors.success;
    case 'error':
      return colors.error;
    case 'warning':
      return colors.warning;
    default:
      return colors.info;
  }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const remove = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    },
    []
  );

  const show = useCallback(
    (message, variant = 'info', options = {}) => {
      const id = makeId();
      const duration = Math.max(1200, Number(options.duration || 2600));

      setToasts((current) => [
        ...current.slice(-2),
        {
          id,
          variant,
          message: String(message || ''),
          title: options.title ? String(options.title) : '',
        },
      ]);

      if (duration > 0) {
        const timer = setTimeout(() => remove(id), duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [remove]
  );

  const value = useMemo(
    () => ({
      show,
      info: (message, options) => show(message, 'info', options),
      success: (message, options) => show(message, 'success', options),
      warning: (message, options) => show(message, 'warning', options),
      error: (message, options) => show(message, 'error', options),
      remove,
      clear: () => setToasts([]),
    }),
    [remove, show]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, onRemove }) {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.viewport, { top: insets.top + 10 }]}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </View>
  );
}

function ToastItem({ toast, onRemove }) {
  const { colors, isDark } = useTheme();
  const { isRTL, t } = useI18n();

  const translateY = useRef(new Animated.Value(-14)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const Icon = getIconComponent(toast.variant);
  const accent = getVariantColor(toast.variant, colors);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -10, duration: 150, useNativeDriver: true }),
    ]).start(() => onRemove(toast.id));
  }, [onRemove, opacity, toast.id, translateY]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 16,
        stiffness: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
          borderColor: colors.border,
          transform: [{ translateY }],
          opacity,
        },
        shadow.md,
      ]}
    >
      <View
        style={[
          styles.accent,
          {
            backgroundColor: accent,
            left: isRTL ? undefined : 0,
            right: isRTL ? 0 : undefined,
          },
        ]}
      />

      <View style={[styles.toastBody, { flexDirection: getRowDirection(isRTL) }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.surfaceSoft }]}>
          <Icon size={16} color={accent} strokeWidth={2.4} />
        </View>

        <View style={styles.messageWrap}>
          {toast.title ? (
            <Text variant="bodySmall" weight="semibold">
              {toast.title}
            </Text>
          ) : null}
          <Text variant="bodySmall" color={colors.textSecondary}>
            {toast.message}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.accessibility.closeToast')}
          onPress={dismiss}
          style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
        >
          <X size={16} color={colors.textSecondary} strokeWidth={2.5} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  viewport: {
    left: spacing.lg,
    right: spacing.lg,
    position: 'absolute',
    zIndex: 100,
  },
  toast: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  accent: {
    position: 'absolute',
    width: 4,
    top: 0,
    bottom: 0,
  },
  toastBody: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageWrap: {
    flex: 1,
    gap: 2,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    opacity: 0.7,
  },
});
