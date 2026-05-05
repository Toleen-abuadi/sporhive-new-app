import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useToast } from "../../../components/feedback/ToastHost";
import { AppScreen } from "../../../components/ui/AppScreen";
import { Button } from "../../../components/ui/Button";
import { Chip } from "../../../components/ui/Chip";
import { LanguageSwitch } from "../../../components/ui/LanguageSwitch";
import { SectionLoader } from "../../../components/ui/Loader";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import { Text } from "../../../components/ui/Text";
import { ROUTES } from "../../../constants/routes";
import { useI18n } from "../../../hooks/useI18n";
import { useTheme } from "../../../hooks/useTheme";
import { spacing } from "../../../theme/tokens";
import { getRowDirection } from "../../../utils/rtl";
import { playerPortalApi } from "../api/playerPortal.api";
import { PortalErrorState, PortalSectionCard } from "../components";
import { usePlayerPayments, usePlayerPortalSession } from "../hooks";
import {
  createInvoiceDocument,
  downloadInvoiceDocument,
  revokeInvoiceDocument,
} from "../utils/playerPortal.invoice";

const resolveParam = (value) => (Array.isArray(value) ? value[0] : value);
const normalizeInvoiceLanguage = (value) =>
  String(value || "").toLowerCase() === "ar" ? "ar" : "en";

const resolveInvoiceErrorMessage = (reason, t) => {
  const code = String(reason?.code || "").toUpperCase();
  if (code === "INVOICE_EMPTY") {
    return t("playerPortal.payments.invoice.errors.empty");
  }

  if (code === "INVOICE_RESPONSE_INVALID") {
    return t("playerPortal.payments.invoice.errors.invalid");
  }

  if (
    code === "HTTP_ERROR" ||
    code === "NETWORK_ERROR" ||
    code === "AUTH_REQUEST_FAILED" ||
    code === "UNAUTHORIZED" ||
    code === "CONFIG_ERROR"
  ) {
    return t("playerPortal.payments.invoice.errors.download");
  }

  return t("playerPortal.payments.invoice.errors.download");
};

export function PlayerPaymentInvoiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const toast = useToast();
  const { t, locale, isRTL } = useI18n();
  const { colors } = useTheme();
  const paymentId = resolveParam(params.paymentId);

  const session = usePlayerPortalSession();
  const { overview, getPaymentById } = usePlayerPayments();

  const payment = useMemo(
    () => getPaymentById(paymentId),
    [getPaymentById, paymentId],
  );

  const [invoiceLanguage, setInvoiceLanguage] = useState(() =>
    normalizeInvoiceLanguage(locale),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [documentRef, setDocumentRef] = useState(null);
  const isLoadingRef = useRef(false);

  const showLoadingState = isLoading;

  const releaseDocument = useCallback((doc) => {
    if (!doc) return;
    revokeInvoiceDocument(doc);
  }, []);

  const loadInvoice = useCallback(
    async ({
      silent = false,
      downloadAfterLoad = false,
    } = {}) => {
      if (!session.requestContext || !payment) {
        return {
          success: false,
          error: new Error("Invoice context is incomplete."),
        };
      }

      if (isLoadingRef.current) {
        return {
          success: false,
          error: Object.assign(new Error("Invoice request is already in progress."), {
            code: "INVOICE_IN_PROGRESS",
          }),
        };
      }

      isLoadingRef.current = true;
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const resolvedPaymentId = Number(payment.id);
        if (!Number.isFinite(resolvedPaymentId)) {
          throw new Error("Invoice payment reference is invalid.");
        }

        if (__DEV__) {
          console.log("[playerPortal][invoice-screen] selected-payment", {
            id: payment?.id ?? null,
            invoice_id: payment?.invoiceId || payment?.externalInvoiceNumber || null,
            amount: payment?.amountNumber ?? payment?.amount ?? null,
            status: payment?.status || null,
          });
        }

        const result = await playerPortalApi.printInvoice(
          session.requestContext,
          {
            id: resolvedPaymentId,
            language: invoiceLanguage,
            player_name:
              invoiceLanguage === "ar"
                ? overview?.player?.arabicName ||
                  overview?.player?.displayName ||
                  "Player"
                : overview?.player?.englishName ||
                  overview?.player?.displayName ||
                  "Player",
          },
        );

        if (!result?.success) {
          throw result?.error || new Error("Failed to generate invoice.");
        }

        const nextDocument = await createInvoiceDocument({
          arrayBuffer: result.data.arrayBuffer,
          fileName: result.data.fileName || `invoice-${payment.id}.pdf`,
          contentType: result.data.contentType,
          contentDisposition: result.data.contentDisposition,
        });

        setDocumentRef((prev) => {
          releaseDocument(prev);
          return nextDocument;
        });

        if (downloadAfterLoad) {
          await downloadInvoiceDocument(nextDocument);
          toast.success(
            t("playerPortal.payments.invoice.readyHint", {
              name: nextDocument.fileName || `invoice-${payment.id}.pdf`,
            }),
          );
        }

        return { success: true, data: nextDocument };
      } catch (reason) {
        setError(reason);
        return { success: false, error: reason };
      } finally {
        isLoadingRef.current = false;
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [
      invoiceLanguage,
      overview?.player?.arabicName,
      overview?.player?.displayName,
      overview?.player?.englishName,
      payment,
      releaseDocument,
      session.requestContext,
      t,
      toast,
    ],
  );

  useEffect(
    () => () => {
      releaseDocument(documentRef);
    },
    [documentRef, releaseDocument],
  );

  const handleDownload = async () => {
    if (isLoadingRef.current || isLoading) {
      return;
    }

    const result = await loadInvoice({
      silent: false,
      downloadAfterLoad: true,
    });

    if (!result?.success && String(result?.error?.code || "") !== "INVOICE_IN_PROGRESS") {
      toast.error(resolveInvoiceErrorMessage(result?.error, t));
    }
  };

  return (
    <AppScreen
      scroll
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleDownload}
          tintColor={colors.accentOrange}
          colors={[colors.accentOrange]}
        />
      }
    >
      <ScreenHeader
        title={t("playerPortal.payments.invoice.title")}
        subtitle={t("playerPortal.payments.invoice.subtitle")}
        onBack={() => router.replace(ROUTES.PLAYER_PAYMENTS)}
        right={<LanguageSwitch compact />}
      />

      {!payment ? (
        <PortalSectionCard>
          <PortalErrorState
            title={t("playerPortal.payments.detail.notFoundTitle")}
            fallbackMessage={t(
              "playerPortal.payments.detail.notFoundDescription",
            )}
            retryLabel={t("playerPortal.actions.backHome")}
            onRetry={() => router.replace(ROUTES.PLAYER_PAYMENTS)}
          />
        </PortalSectionCard>
      ) : null}

      {payment ? (
        <PortalSectionCard
          title={t("playerPortal.payments.invoice.previewTitle")}
          subtitle={t("playerPortal.payments.invoice.previewSubtitle", {
            id: payment.id,
          })}
        >
          <View style={styles.languageWrap}>
            <Text variant="caption" color={colors.textSecondary}>
              {t("playerPortal.payments.invoice.language.label")}
            </Text>

            <View
              style={[
                styles.languageChips,
                { flexDirection: getRowDirection(isRTL) },
              ]}
            >
              <Chip
                label={t("playerPortal.payments.invoice.language.ar")}
                selected={invoiceLanguage === "ar"}
                onPress={() => setInvoiceLanguage("ar")}
                disabled={isLoading}
              />
              <Chip
                label={t("playerPortal.payments.invoice.language.en")}
                selected={invoiceLanguage === "en"}
                onPress={() => setInvoiceLanguage("en")}
                disabled={isLoading}
              />
            </View>
          </View>

          {showLoadingState ? (
            <View style={styles.loadingWrap}>
              <SectionLoader
                minHeight={120}
                label={t("playerPortal.payments.invoice.loading")}
                style={styles.invoiceLoader}
              />
            </View>
          ) : null}

          {!showLoadingState && error ? (
            <PortalErrorState
              title={t("playerPortal.payments.invoice.errors.loadTitle")}
              error={error}
              fallbackMessage={t(
                "playerPortal.payments.invoice.errors.loadFallback",
              )}
              retryLabel={t("playerPortal.actions.retry")}
              onRetry={handleDownload}
            />
          ) : null}

          {!showLoadingState && !error ? (
            <View style={styles.readyWrap}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {documentRef
                  ? t("playerPortal.payments.invoice.readyHint", {
                      name:
                        documentRef.fileName || `invoice-${payment.id}.pdf`,
                    })
                  : t("playerPortal.payments.invoice.previewSubtitle", {
                      id: payment.id,
                    })}
              </Text>

              <Button fullWidth onPress={handleDownload} disabled={isLoading}>
                {t("playerPortal.payments.actions.downloadInvoice")}
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
  languageWrap: {
    gap: spacing.xs,
  },
  languageChips: {
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  loadingWrap: {
    minHeight: 120,
  },
  invoiceLoader: {
    borderWidth: 0,
    width: "100%",
  },
  readyWrap: {
    gap: spacing.sm,
  },
});
