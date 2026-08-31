import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  MessageCircle,
  X,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useToast } from '../../../components/feedback/ToastHost';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import { KeyboardAwareModalSheet } from '../../../components/ui/KeyboardAwareModalSheet';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { ROUTES } from '../../../constants/routes';
import { SegmentedToggle } from '../../auth/components';
import { playerPortalApi } from '../api/playerPortal.api';
import { PortalEmptyState, PortalErrorState, PortalSectionCard, PortalSkeletonCard } from '../components';
import { usePlayerPortalSession } from '../hooks';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { toEnglishDigits, resolveNumericLocale } from '../../../utils/numbering';
import { getRowDirection, getTextAlign } from '../../../utils/rtl';
import { resolvePortalGuardMessage } from '../utils/playerPortal.messages';

const DEFAULT_CATEGORY = 'question';
const DEFAULT_PRIORITY = 'normal';
const MESSAGE_MAX_LENGTH = 3000;
const SUBJECT_MAX_LENGTH = 255;

const CATEGORY_OPTIONS = Object.freeze(['feedback', 'complaint', 'note', 'question', 'other']);
const PRIORITY_OPTIONS = Object.freeze(['normal', 'urgent']);
const STATUS_OPTIONS = Object.freeze(['unread', 'read', 'in_progress', 'resolved', 'closed']);

const resolveLocaleForDateTime = (locale) =>
  resolveNumericLocale(locale, String(locale || '').toLowerCase().startsWith('ar') ? 'ar-JO' : 'en-US');

const cleanTextValue = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).trim();
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();

  if (typeof value === 'object') {
    const candidates = [
      value.subject,
      value.title,
      value.name,
      value.label,
      value.text,
      value.message,
      value.body,
      value.body_preview,
      value.preview,
      value.description,
      value.content,
      value.value,
    ];

    for (let index = 0; index < candidates.length; index += 1) {
      const normalized = cleanTextValue(candidates[index]);
      if (normalized) return normalized;
    }
  }

  return '';
};

const normalizeEnumValue = (value, allowedValues, fallback) => {
  const normalized = cleanTextValue(value)
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (allowedValues.includes(normalized)) {
    return normalized;
  }

  return fallback;
};

const truncateText = (value, maxLength = 160) => {
  const text = cleanTextValue(value).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
};

const getMessageId = (item) =>
  cleanTextValue(
    item?.id ??
      item?.message_id ??
      item?.messageId ??
      item?.uuid ??
      item?.uid ??
      item?._id ??
      item?.message?.id
  );

const getMessageStatus = (item) =>
  normalizeEnumValue(item?.status ?? item?.message_status ?? item?.state, STATUS_OPTIONS, 'unread');

const getMessageCategory = (item) =>
  normalizeEnumValue(item?.category ?? item?.type ?? item?.message_type, CATEGORY_OPTIONS, 'other');

const getMessagePriority = (item) =>
  normalizeEnumValue(item?.priority ?? item?.level ?? item?.message_priority, PRIORITY_OPTIONS, 'normal');

const getMessageSubject = (item) =>
  cleanTextValue(
    item?.subject ??
      item?.title ??
      item?.name ??
      item?.topic ??
      item?.message?.subject ??
      item?.message?.title
  );

const getMessageBody = (item) =>
  cleanTextValue(
    item?.body ??
      item?.body_preview ??
      item?.message ??
      item?.description ??
      item?.content ??
      item?.text ??
      item?.message?.body ??
      item?.message?.text
  );

const getMessageCreatedAt = (item) =>
  cleanTextValue(
    item?.created_at ??
      item?.createdAt ??
      item?.created ??
      item?.inserted_at ??
      item?.timestamp ??
      item?.message?.created_at
  );

const getMessageUpdatedAt = (item) =>
  cleanTextValue(
    item?.updated_at ??
      item?.updatedAt ??
      item?.modified_at ??
      item?.modifiedAt ??
      item?.message?.updated_at
  );

const normalizeMessage = (item) => {
  const source =
    item && typeof item === 'object'
      ? item.data && typeof item.data === 'object'
        ? item.data
        : item.message && typeof item.message === 'object'
        ? item.message
        : item.item && typeof item.item === 'object'
        ? item.item
        : item.payload && typeof item.payload === 'object'
        ? item.payload
        : item
      : item;
  const subject = getMessageSubject(source);
  const body = getMessageBody(source);
  const createdAt = getMessageCreatedAt(source);
  const updatedAt = getMessageUpdatedAt(source);
  const id = getMessageId(source);

  return {
    id,
    status: getMessageStatus(source),
    category: getMessageCategory(source),
    priority: getMessagePriority(source),
    subject,
    body,
    bodyPreview: truncateText(body || source?.body_preview || source?.preview || source?.message, 180),
    createdAt,
    updatedAt,
    raw: source && typeof source === 'object' ? source : {},
  };
};

const extractMessageRows = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  const root = payload && typeof payload === 'object' ? payload : {};
  const data = root.data && typeof root.data === 'object' ? root.data : {};

  return [
    ...((Array.isArray(root.rows) && root.rows) || []),
    ...((Array.isArray(data.rows) && data.rows) || []),
    ...((Array.isArray(root.items) && root.items) || []),
    ...((Array.isArray(data.items) && data.items) || []),
    ...((Array.isArray(root.results) && root.results) || []),
    ...((Array.isArray(data.results) && data.results) || []),
    ...((Array.isArray(root.messages) && root.messages) || []),
    ...((Array.isArray(data.messages) && data.messages) || []),
  ];
};

const sortMessageRows = (rows = []) =>
  [...rows].sort((left, right) => {
    const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
    const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
  });

const normalizeMessageCollection = (payload) =>
  sortMessageRows(
    extractMessageRows(payload)
      .map(normalizeMessage)
      .filter((item) => Boolean(item.id || item.subject || item.body))
  );

const formatMessageDateTimeLabel = (value, locale, fallback = '-') => {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;

  try {
    return toEnglishDigits(
      parsed.toLocaleString(resolveLocaleForDateTime(locale), {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  } catch {
    return fallback;
  }
};

const getCategoryLabel = (category, t) => t(`playerMessages.category.${category}`);
const getPriorityLabel = (priority, t) => t(`playerMessages.priority.${priority}`);
const getStatusTranslationKey = (status) => {
  const normalized = cleanTextValue(status).toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'in_progress') return 'inProgress';
  return normalized;
};
const getStatusLabel = (status, t) => t(`playerMessages.status.${getStatusTranslationKey(status)}`);

const getBadgeTone = (kind, value) => {
  const normalized = cleanTextValue(value).toLowerCase();

  if (kind === 'status') {
    switch (normalized) {
      case 'unread':
        return 'orange';
      case 'read':
        return 'info';
      case 'in_progress':
        return 'warning';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  if (kind === 'priority') {
    return normalized === 'urgent' ? 'danger' : 'neutral';
  }

  if (kind === 'category') {
    switch (normalized) {
      case 'feedback':
      case 'question':
        return 'orange';
      case 'complaint':
        return 'danger';
      case 'note':
        return 'info';
      default:
        return 'neutral';
    }
  }

  return 'neutral';
};

function Badge({ label, tone = 'neutral', style }) {
  const { colors } = useTheme();
  const palette = {
    neutral: {
      backgroundColor: colors.surfaceSoft,
      textColor: colors.textSecondary,
    },
    orange: {
      backgroundColor: colors.accentOrangeSoft,
      textColor: colors.accentOrange,
    },
    info: {
      backgroundColor: colors.infoSoft,
      textColor: colors.info,
    },
    success: {
      backgroundColor: colors.successSoft,
      textColor: colors.success,
    },
    warning: {
      backgroundColor: colors.warningSoft,
      textColor: colors.warning,
    },
    danger: {
      backgroundColor: colors.errorSoft,
      textColor: colors.error,
    },
  };
  const selected = palette[tone] || palette.neutral;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: selected.backgroundColor,
        },
        style,
      ]}
    >
      <Text variant="caption" weight="semibold" color={selected.textColor}>
        {label}
      </Text>
    </View>
  );
}

function DetailRow({ label, value }) {
  const { colors } = useTheme();

  return (
    <View style={styles.detailRow}>
      <Text variant="caption" color={colors.textSecondary}>
        {label}
      </Text>
      <Text variant="bodySmall" weight="semibold">
        {value || '-'}
      </Text>
    </View>
  );
}

function MessageDetailModal({
  visible,
  message,
  onClose,
}) {
  const { colors } = useTheme();
  const { t, isRTL, locale } = useI18n();
  const messageData = message || null;
  const hasMessage = Boolean(messageData);
  const status = messageData?.status || 'unread';
  const category = messageData?.category || 'other';
  const priority = messageData?.priority || 'normal';

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAwareModalSheet
          backgroundColor={colors.background}
          borderColor={colors.border}
          maxHeightRatio={0.9}
        >
          <View style={[styles.sheetHeader, { flexDirection: getRowDirection(isRTL) }]}>
            <View style={styles.sheetHeaderText}>
              <Text variant="h3" weight="bold">
                {t('playerMessages.details')}
              </Text>
              {messageData?.createdAt ? (
                <Text variant="caption" color={colors.textSecondary}>
                  {t('playerMessages.createdAt')}: {formatMessageDateTimeLabel(messageData.createdAt, locale)}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.actions.cancel')}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.surfaceSoft : colors.surface,
                },
              ]}
            >
              <X size={16} color={colors.textPrimary} strokeWidth={2.3} />
            </Pressable>
          </View>

          {hasMessage ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sheetBody}
            >
              <View
                style={[
                  styles.badgeRow,
                  {
                    flexDirection: getRowDirection(isRTL),
                    alignSelf: isRTL ? 'flex-end' : 'flex-start',
                  },
                ]}
              >
                <Badge label={getCategoryLabel(category, t)} tone={getBadgeTone('category', category)} />
                <Badge label={getStatusLabel(status, t)} tone={getBadgeTone('status', status)} />
                {priority === 'urgent' ? (
                  <Badge
                    label={getPriorityLabel(priority, t)}
                    tone={getBadgeTone('priority', priority)}
                  />
                ) : null}
              </View>

              <Surface variant="soft" padding="md" style={styles.detailBox}>
                <DetailRow label={t('playerMessages.subject')} value={messageData.subject} />
                <DetailRow label={t('playerMessages.category.label')} value={getCategoryLabel(category, t)} />
                <DetailRow label={t('playerMessages.priority.label')} value={getPriorityLabel(priority, t)} />
                <DetailRow
                  label={t('playerMessages.createdAt')}
                  value={formatMessageDateTimeLabel(messageData.createdAt, locale)}
                />
                {messageData.updatedAt ? (
                  <DetailRow
                    label={t('playerMessages.updatedAt')}
                    value={formatMessageDateTimeLabel(messageData.updatedAt, locale)}
                  />
                ) : null}
              </Surface>

              <View style={styles.messageBodyWrap}>
                <Text variant="caption" color={colors.textSecondary}>
                  {t('playerMessages.message')}
                </Text>
                <Surface variant="soft" padding="md" style={styles.messageBodyBox}>
                  <Text variant="bodySmall" color={colors.textPrimary}>
                    {messageData.body || '-'}
                  </Text>
                </Surface>
              </View>
            </ScrollView>
          ) : null}

          {hasMessage ? (
            <Button variant="secondary" fullWidth onPress={onClose}>
              {t('common.actions.done')}
            </Button>
          ) : null}
        </KeyboardAwareModalSheet>
      </View>
    </Modal>
  );
}

export function PlayerContactAdminScreen() {
  const router = useRouter();
  const toast = useToast();
  const { t, locale, isRTL } = useI18n();
  const { colors } = useTheme();
  const session = usePlayerPortalSession({ requirePlayerId: false });
  const loadingRef = useRef(false);

  const [messages, setMessages] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [listError, setListError] = useState(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState(DEFAULT_PRIORITY);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const canFetch = Boolean(session.canAccessPortal && session.requestContext);
  const isInitialLoading = (listLoading || (!messages.length && !listError)) && messages.length === 0;

  const validationErrors = useMemo(() => {
    const nextErrors = {};
    const trimmedSubject = cleanTextValue(subject);
    const trimmedBody = cleanTextValue(body);

    if (!cleanTextValue(category)) {
      nextErrors.category = t('playerMessages.validation.categoryRequired');
    }
    if (!trimmedSubject) {
      nextErrors.subject = t('playerMessages.validation.subjectRequired');
    } else if (trimmedSubject.length > SUBJECT_MAX_LENGTH) {
      nextErrors.subject = t('playerMessages.validation.subjectTooLong');
    }
    if (!trimmedBody) {
      nextErrors.body = t('playerMessages.validation.messageRequired');
    } else if (trimmedBody.length > MESSAGE_MAX_LENGTH) {
      nextErrors.body = t('playerMessages.validation.messageTooLong');
    }

    return nextErrors;
  }, [body, category, subject, t]);

  const canSubmit = useMemo(
    () => Object.keys(validationErrors).length === 0 && !isSending && canFetch,
    [canFetch, isSending, validationErrors]
  );

  const loadMessages = useCallback(
    async ({ refresh = false } = {}) => {
      if (!session.requestContext || loadingRef.current) {
        return { success: false, error: listError };
      }

      loadingRef.current = true;
      if (refresh) {
        setListRefreshing(true);
      } else if (messages.length === 0) {
        setListLoading(true);
      }
      setListError(null);

      try {
        const result = await playerPortalApi.listPlayerPortalMessages(session.requestContext);
        if (!result.success) {
          throw result.error;
        }

        const normalized = normalizeMessageCollection(result.data);
        setMessages(normalized);
        return { success: true, data: normalized };
      } catch (error) {
        setListError(error || null);
        toast.error(cleanTextValue(error?.message) || t('playerMessages.toast.loadFailed'));
        return { success: false, error };
      } finally {
        loadingRef.current = false;
        setListLoading(false);
        setListRefreshing(false);
      }
    },
    [listError, messages.length, session.requestContext, t, toast]
  );

  const openMessageDetail = useCallback((item) => {
    setSelectedMessage(normalizeMessage(item));
    setDetailVisible(true);
  }, []);

  const closeMessageDetail = useCallback(() => {
    setDetailVisible(false);
    setSelectedMessage(null);
  }, []);

  const retryListLoad = useCallback(() => {
    loadMessages({ refresh: true });
  }, [loadMessages]);

  useFocusEffect(
    useCallback(() => {
      if (!canFetch) return undefined;
      loadMessages({ refresh: messages.length > 0 });
      return undefined;
    }, [canFetch, loadMessages, messages.length])
  );

  const categoryOptions = useMemo(
    () =>
      CATEGORY_OPTIONS.map((value) => ({
        value,
        label: getCategoryLabel(value, t),
      })),
    [t]
  );

  const priorityOptions = useMemo(
    () =>
      PRIORITY_OPTIONS.map((value) => ({
        value,
        label: getPriorityLabel(value, t),
      })),
    [t]
  );

  const sendMessage = useCallback(async () => {
    if (!canFetch || isSending) return;

    setSubmitAttempted(true);
    if (Object.keys(validationErrors).length > 0) {
      const firstError = validationErrors.category || validationErrors.subject || validationErrors.body;
      if (firstError) {
        toast.error(firstError);
      }
      return;
    }

    setIsSending(true);

    const payload = {
      category: cleanTextValue(category),
      subject: cleanTextValue(subject),
      body: cleanTextValue(body),
      priority: cleanTextValue(priority) || DEFAULT_PRIORITY,
    };

    try {
      const result = await playerPortalApi.createPlayerPortalMessage(session.requestContext, payload);
      if (!result.success) {
        throw result.error;
      }

      toast.success(t('playerMessages.toast.sent'));
      setCategory(DEFAULT_CATEGORY);
      setPriority(DEFAULT_PRIORITY);
      setSubject('');
      setBody('');
      setSubmitAttempted(false);
      await loadMessages({ refresh: true });
    } catch (error) {
      toast.error(cleanTextValue(error?.message) || t('playerMessages.toast.sendFailed'));
    } finally {
      setIsSending(false);
    }
  }, [
    body,
    canFetch,
    category,
    isSending,
    loadMessages,
    priority,
    session.requestContext,
    subject,
    t,
    toast,
    validationErrors,
  ]);

  return (
    <AppScreen
      scroll
      keyboardAware
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={listRefreshing}
          onRefresh={() => loadMessages({ refresh: true })}
          tintColor={colors.accentOrange}
          colors={[colors.accentOrange]}
        />
      }
    >
      <ScreenHeader
        title={t('playerMessages.contactAdmin')}
        subtitle={t('playerMessages.contactSubtitle')}
        onBack={() => router.replace(ROUTES.PLAYER_HOME)}
        right={<LanguageSwitch compact />}
      />

      {!canFetch ? (
        <PortalSectionCard>
          <PortalEmptyState
            title={t('playerPortal.home.unavailableTitle')}
            description={resolvePortalGuardMessage(session.guardReason, t)}
            icon={MessageCircle}
          />
        </PortalSectionCard>
      ) : null}

      {canFetch ? (
        <PortalSectionCard
          title={t('playerMessages.newMessage')}
          right={
            <View style={[styles.headerIcon, { backgroundColor: colors.accentOrangeSoft }]}>
              <MessageCircle size={16} color={colors.accentOrange} strokeWidth={2.3} />
            </View>
          }
        >
          <View style={styles.formStack}>
            <View style={styles.fieldGroup}>
              <Text variant="caption" color={colors.textSecondary}>
                {t('playerMessages.category.label')}
              </Text>
              <View style={[styles.categoryWrap, { flexDirection: getRowDirection(isRTL) }]}>
                {categoryOptions.map((item) => (
                  <Chip
                    key={item.value}
                    label={item.label}
                    selected={category === item.value}
                    onPress={() => {
                      setCategory(item.value);
                      if (submitAttempted) {
                        setSubmitAttempted(true);
                      }
                    }}
                  />
                ))}
              </View>
              {submitAttempted && validationErrors.category ? (
                <Text variant="caption" color={colors.error}>
                  {validationErrors.category}
                </Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text variant="caption" color={colors.textSecondary}>
                {t('playerMessages.subject')}
              </Text>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder={t('playerMessages.subjectPlaceholder')}
                placeholderTextColor={colors.inputPlaceholder || colors.textMuted}
                maxLength={SUBJECT_MAX_LENGTH}
                autoCapitalize="sentences"
                style={[
                  styles.input,
                  {
                    color: colors.inputText || colors.textPrimary,
                    borderColor: submitAttempted && validationErrors.subject ? colors.inputBorderError || colors.error : colors.inputBorder || colors.border,
                    backgroundColor: colors.inputBackground || colors.surface,
                    textAlign: getTextAlign(isRTL),
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                  },
                ]}
              />
              {submitAttempted && validationErrors.subject ? (
                <Text variant="caption" color={colors.error}>
                  {validationErrors.subject}
                </Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text variant="caption" color={colors.textSecondary}>
                {t('playerMessages.message')}
              </Text>
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder={t('playerMessages.messagePlaceholder')}
                placeholderTextColor={colors.inputPlaceholder || colors.textMuted}
                maxLength={MESSAGE_MAX_LENGTH}
                autoCapitalize="sentences"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    color: colors.inputText || colors.textPrimary,
                    borderColor: submitAttempted && validationErrors.body ? colors.inputBorderError || colors.error : colors.inputBorder || colors.border,
                    backgroundColor: colors.inputBackground || colors.surface,
                    textAlign: getTextAlign(isRTL),
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                  },
                ]}
              />
              <View style={[styles.countRow, { flexDirection: getRowDirection(isRTL) }]}>
                <Text variant="caption" color={colors.textMuted}>
                  {cleanTextValue(body).length}/{MESSAGE_MAX_LENGTH}
                </Text>
              </View>
              {submitAttempted && validationErrors.body ? (
                <Text variant="caption" color={colors.error}>
                  {validationErrors.body}
                </Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text variant="caption" color={colors.textSecondary}>
                {t('playerMessages.priority.label')}
              </Text>
              <SegmentedToggle
                value={priority}
                onChange={setPriority}
                options={priorityOptions}
              />
            </View>

            <Button
              fullWidth
              onPress={sendMessage}
              loading={isSending}
              disabled={!canSubmit}
            >
              {isSending ? t('playerMessages.sending') : t('playerMessages.send')}
            </Button>
          </View>
        </PortalSectionCard>
      ) : null}

      {canFetch ? (
        <PortalSectionCard title={t('playerMessages.history')}>
          {isInitialLoading ? (
            <View style={styles.historyLoading}>
              <PortalSkeletonCard rows={[18, 12, 12, 12]} />
              <PortalSkeletonCard rows={[18, 12, 12, 12]} />
            </View>
          ) : null}

          {!isInitialLoading && listError && messages.length === 0 ? (
            <PortalErrorState
              title={t('playerMessages.toast.loadFailed')}
              error={listError}
              fallbackMessage={t('playerMessages.toast.loadFailed')}
              retryLabel={t('playerMessages.retry')}
              onRetry={retryListLoad}
            />
          ) : null}

          {!isInitialLoading && !listError && messages.length === 0 ? (
            <PortalEmptyState
              title={t('playerMessages.empty.title')}
              description={t('playerMessages.empty.description')}
              icon={MessageCircle}
            />
          ) : null}

          {!isInitialLoading && messages.length > 0 ? (
            <View style={styles.messageList}>
              {messages.map((item) => {
                const categoryLabel = getCategoryLabel(item.category, t);
                const statusLabel = getStatusLabel(item.status, t);
                const priorityLabel = getPriorityLabel(item.priority, t);

                return (
                  <Pressable
                    key={item.id || `${item.subject}-${item.createdAt}`}
                    accessibilityRole="button"
                    accessibilityLabel={item.subject || categoryLabel}
                    onPress={() => openMessageDetail(item)}
                    style={({ pressed }) => [
                      styles.messageCard,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        opacity: pressed ? 0.86 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.messageTopRow, { flexDirection: getRowDirection(isRTL) }]}>
                      <View style={styles.messageTopText}>
                        <Text variant="bodySmall" weight="bold" numberOfLines={1}>
                          {item.subject || t('playerMessages.subject')}
                        </Text>
                        <Text variant="caption" color={colors.textMuted}>
                          {formatMessageDateTimeLabel(item.createdAt, locale)}
                        </Text>
                      </View>
                      <ChevronRight
                        size={16}
                        color={colors.textMuted}
                        style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }}
                      />
                    </View>

                    <View style={[styles.badgeRow, { flexDirection: getRowDirection(isRTL) }]}>
                      <Badge
                        label={categoryLabel}
                        tone={getBadgeTone('category', item.category)}
                      />
                      <Badge
                        label={statusLabel}
                        tone={getBadgeTone('status', item.status)}
                      />
                      {item.priority === 'urgent' ? (
                        <Badge
                          label={priorityLabel}
                          tone={getBadgeTone('priority', item.priority)}
                        />
                      ) : null}
                    </View>

                    <Text variant="bodySmall" color={colors.textSecondary} numberOfLines={3}>
                      {item.bodyPreview || item.body || t('playerMessages.message')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {!isInitialLoading && listError && messages.length > 0 ? (
            <PortalErrorState
              compact
              title={t('playerMessages.toast.loadFailed')}
              error={listError}
              fallbackMessage={t('playerMessages.toast.loadFailed')}
              retryLabel={t('playerMessages.retry')}
              onRetry={retryListLoad}
            />
          ) : null}
        </PortalSectionCard>
      ) : null}

      <MessageDetailModal
        visible={detailVisible}
        message={selectedMessage}
        onClose={closeMessageDetail}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formStack: {
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  categoryWrap: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  textArea: {
    minHeight: 150,
    paddingTop: spacing.md,
  },
  countRow: {
    justifyContent: 'flex-end',
  },
  historyLoading: {
    gap: spacing.sm,
  },
  messageList: {
    gap: spacing.sm,
  },
  messageCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  messageTopRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  messageTopText: {
    flex: 1,
    gap: 2,
  },
  badgeRow: {
    width: '100%',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sheetHeaderText: {
    flex: 1,
    gap: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  detailBox: {
    gap: spacing.sm,
  },
  detailRow: {
    gap: 2,
  },
  messageBodyWrap: {
    gap: spacing.xs,
  },
  messageBodyBox: {
    minHeight: 120,
  },
});
