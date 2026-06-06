import { forwardRef, useCallback, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useI18n } from '../../hooks/useI18n';
import { getRowDirection } from '../../utils/rtl';

export const RtlHorizontalScrollView = forwardRef(function RtlHorizontalScrollView(
  {
    children,
    contentContainerStyle,
    rtlAutoScroll = true,
    onContentSizeChange,
    showsHorizontalScrollIndicator = false,
    ...props
  },
  forwardedRef
) {
  const { isRTL } = useI18n();
  const localRef = useRef(null);
  const lastWidthRef = useRef(0);

  const setRef = useCallback(
    (node) => {
      localRef.current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef]
  );

  const handleContentSizeChange = useCallback(
    (width, height) => {
      onContentSizeChange?.(width, height);
      if (!rtlAutoScroll || !isRTL || !localRef.current) return;
      if (lastWidthRef.current === width) return;
      lastWidthRef.current = width;

      requestAnimationFrame(() => {
        localRef.current?.scrollToEnd({ animated: false });
      });
    },
    [isRTL, onContentSizeChange, rtlAutoScroll]
  );

  return (
    <ScrollView
      {...props}
      ref={setRef}
      horizontal
      showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
      onContentSizeChange={handleContentSizeChange}
      contentContainerStyle={[
        contentContainerStyle,
        {
          flexDirection: getRowDirection(isRTL),
          flexGrow: 1,
          justifyContent: isRTL ? 'flex-end' : 'flex-start',
        },
      ]}
    >
      {children}
    </ScrollView>
  );
});
