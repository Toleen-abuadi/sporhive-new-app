import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Download, ExternalLink, Share2 } from 'lucide-react-native';
import { useToast } from '../../../components/feedback/ToastHost';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { SectionLoader } from '../../../components/ui/Loader';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Text } from '../../../components/ui/Text';
import { ROUTES } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../theme/tokens';
import { playerPortalApi } from '../api/playerPortal.api';
import { PortalErrorState, PortalSectionCard } from '../components';
import { usePlayerPayments, usePlayerPortalSession } from '../hooks';
import {
  createInvoiceDocument,
  downloadInvoiceDocument,
  openInvoiceDocument,
  revokeInvoiceDocument,
  shareInvoiceDocument,
} from '../utils/playerPortal.invoice';

const resolveParam = (value) => (Array.isArray(value) ? value[0] : value);

export function PlayerPaymentInvoiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const toast = useToast();
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const paymentId = resolveParam(params.paymentId);

  const session = usePlayerPortalSession();
  const { overview, getPaymentById } = usePlayerPayments();

  const payment = useMemo(() => getPaymentById(paymentId), [getPaymentById, paymentId]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [documentRef, setDocumentRef] = useState(null);
  const autoLoadKeyRef = useRef('');
  const isLoadingRef = useRef(false);
  const showLoadingState = isLoading || (!documentRef && !error);

  const releaseDocument = useCallback((doc) => {
    if (!doc) return;
    revokeInvoiceDocument(doc);
  }, []);

  const loadInvoice = useCallback(
    async ({ refresh = false } = {}) => {
      if (!session.requestContext || !payment) return;
      if (isLoadingRef.current && !refresh) return;

      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const result = await playerPortalApi.printInvoice(session.requestContext, {
          id: payment.id,
          language: locale === 'ar' ? 'ar' : 'en',
          player_name: overview?.player?.displayName || 'Player',
        });

        if (!result.success) {
          throw result.error;
        }

        const nextDocument = await createInvoiceDocument({
          arrayBuffer: result.data.arrayBuffer,
          fileName: result.data.fileName || `invoice-${payment.id}.pdf`,
          contentType: result.data.contentType,
        });

        setDocumentRef((prev) => {
          releaseDocument(prev);
          return nextDocument;
        });
        return { success: true, data: nextDocument };
      } catch (reason) {
        setError(reason);
        return { success: false, error: reason };
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [
      locale,
      overview?.player?.displayName,
      payment,
      releaseDocument,
      session.requestContext,
    ]
  );

  useEffect(() => {
    if (!payment || !session.requestContext) return;
    const autoLoadKey = `${session.sessionKey || 'session'}:${payment.id}:${locale}`;
    if (autoLoadKeyRef.current === autoLoadKey) return;
    autoLoadKeyRef.current = autoLoadKey;
    loadInvoice();
  }, [loadInvoice, locale, payment, session.requestContext, session.sessionKey]);

  useEffect(
    () => () => {
      releaseDocument(documentRef);
    },
    [documentRef, releaseDocument]
  );

  const handleOpen = async () => {
    try {
      await openInvoiceDocument(documentRef);
    } catch (reason) {
      toast.error(reason?.message || t('playerPortal.payments.invoice.errors.open'));
    }
  };

  const handleShare = async () => {
    try {
      await shareInvoiceDocument(documentRef, {
        message: t('playerPortal.payments.invoice.shareMessage'),
      });
    } catch (reason) {
      toast.error(reason?.message || t('playerPortal.payments.invoice.errors.share'));
    }
  };

  const handleDownload = async () => {
    try {
      await downloadInvoiceDocument(documentRef);
    } catch (reason) {
      toast.error(reason?.message || t('playerPortal.payments.invoice.errors.download'));
    }
  };

  return (
    <AppScreen
      scroll
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => loadInvoice({ refresh: true })}
          tintColor={colors.accentOrange}
          colors={[colors.accentOrange]}
        />
      }
    >
      <ScreenHeader
        title={t('playerPortal.payments.invoice.title')}
        subtitle={t('playerPortal.payments.invoice.subtitle')}
        onBack={() => router.replace(ROUTES.PLAYER_PAYMENTS)}
        right={<LanguageSwitch compact />}
      />

      {!payment ? (
        <PortalSectionCard>
          <PortalErrorState
            title={t('playerPortal.payments.detail.notFoundTitle')}
            fallbackMessage={t('playerPortal.payments.detail.notFoundDescription')}
            retryLabel={t('playerPortal.actions.backHome')}
            onRetry={() => router.replace(ROUTES.PLAYER_PAYMENTS)}
          />
        </PortalSectionCard>
      ) : null}

      {payment ? (
        <PortalSectionCard
          title={t('playerPortal.payments.invoice.previewTitle')}
          subtitle={t('playerPortal.payments.invoice.previewSubtitle', { id: payment.id })}
        >
          {showLoadingState ? (
            <View style={styles.loadingWrap}>
              <SectionLoader
                minHeight={120}
                label={t('playerPortal.payments.invoice.loading')}
                style={styles.invoiceLoader}
              />
            </View>
          ) : null}

          {!showLoadingState && error ? (
            <PortalErrorState
              title={t('playerPortal.payments.invoice.errors.loadTitle')}
              error={error}
              fallbackMessage={t('playerPortal.payments.invoice.errors.loadFallback')}
              retryLabel={t('playerPortal.actions.retry')}
              onRetry={() => loadInvoice({ refresh: true })}
            />
          ) : null}

          {!showLoadingState && !error && documentRef ? (
            <View style={styles.readyWrap}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t('playerPortal.payments.invoice.readyHint', {
                  name: documentRef.fileName || `invoice-${payment.id}.pdf`,
                })}
              </Text>
              <Button
                fullWidth
                onPress={handleOpen}
                leadingIcon={<ExternalLink size={16} color={colors.white} strokeWidth={2.3} />}
              >
                {t('playerPortal.payments.actions.openInvoice')}
              </Button>
              <Button
                fullWidth
                variant="secondary"
                onPress={handleShare}
                leadingIcon={<Share2 size={16} color={colors.textPrimary} strokeWidth={2.3} />}
              >
                {t('playerPortal.payments.actions.shareInvoice')}
              </Button>
              <Button
                fullWidth
                variant="secondary"
                onPress={handleDownload}
                leadingIcon={<Download size={16} color={colors.textPrimary} strokeWidth={2.3} />}
              >
                {t('playerPortal.payments.actions.downloadInvoice')}
              </Button>
            </View>
          ) : null}
        </PortalSectionCard>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  loadingWrap: {
    minHeight: 120,
  },
  invoiceLoader: {
    borderWidth: 0,
    width: '100%',
  },
  readyWrap: {
    gap: spacing.sm,
  },
});
