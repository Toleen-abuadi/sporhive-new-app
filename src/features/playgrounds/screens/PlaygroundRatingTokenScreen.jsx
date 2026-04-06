import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { SectionLoader } from '../../../components/ui/Loader';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { ROUTES, buildAuthLoginRoute, buildPlaygroundsRatingRoute } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { AUTH_LOGIN_MODES } from '../../../services/auth';
import { spacing } from '../../../theme/tokens';
import {
  getPlaygroundsCopy,
  resolvePlaygroundsErrorMessage,
} from '../utils/playgrounds.copy';
import { usePlaygroundsSession, useResolveRatingToken } from '../hooks';
import { PlaygroundsErrorState } from '../components';

const resolveParam = (value) => (Array.isArray(value) ? value[0] : value);

export function PlaygroundRatingTokenScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  const { locale } = useI18n();
  const { colors } = useTheme();
  const copy = getPlaygroundsCopy(locale);
  const session = usePlaygroundsSession({ requireUser: true });

  const resolvedToken = String(resolveParam(token) || '').trim();
  const loginRedirectPath = useMemo(
    () =>
      resolvedToken
        ? `/(public)/playgrounds/rating-token/${encodeURIComponent(resolvedToken)}`
        : ROUTES.PLAYGROUNDS_HOME,
    [resolvedToken]
  );

  const resolveTokenQuery = useResolveRatingToken();
  const lastTokenRef = useRef('');
  const redirectedRef = useRef(false);

  const [resolvedLink, setResolvedLink] = useState(null);
  const [accessError, setAccessError] = useState('');
  const [accessNeedsLogin, setAccessNeedsLogin] = useState(false);

  const resolveCurrentToken = useCallback(
    async ({ refresh = false } = {}) => {
      if (!resolvedToken) {
        setResolvedLink(null);
        setAccessNeedsLogin(false);
        setAccessError(copy.errors.ratingResolveFailed);
        return;
      }

      const result = await resolveTokenQuery.resolveToken(resolvedToken, { refresh });
      if (!result.success) {
        setResolvedLink(null);
        return;
      }

      if (!result.data?.bookingId || !result.data?.userId) {
        setResolvedLink(null);
        setAccessNeedsLogin(false);
        setAccessError(copy.errors.ratingResolveFailed);
        return;
      }

      setResolvedLink({
        bookingId: result.data.bookingId,
        userId: result.data.userId,
      });
      setAccessError('');
      setAccessNeedsLogin(false);
    },
    [copy.errors.ratingResolveFailed, resolveTokenQuery, resolvedToken]
  );

  useEffect(() => {
    redirectedRef.current = false;
  }, [resolvedToken]);

  useEffect(() => {
    if (!resolvedToken) {
      setResolvedLink(null);
      setAccessNeedsLogin(false);
      setAccessError(copy.errors.ratingResolveFailed);
      return;
    }

    if (lastTokenRef.current === resolvedToken) return;
    lastTokenRef.current = resolvedToken;
    resolveCurrentToken();
  }, [copy.errors.ratingResolveFailed, resolveCurrentToken, resolvedToken]);

  useEffect(() => {
    if (!resolvedLink?.bookingId || redirectedRef.current) return;
    if (!session.hydrated) return;

    const sessionUserId = String(session.userId || '').trim();
    const tokenUserId = String(resolvedLink.userId || '').trim();

    if (!tokenUserId) {
      setAccessNeedsLogin(false);
      setAccessError(copy.errors.ratingResolveFailed);
      return;
    }

    if (!session.canRunUserActions || !sessionUserId) {
      setAccessNeedsLogin(true);
      setAccessError(copy.rating.requiresLogin);
      return;
    }

    if (sessionUserId !== tokenUserId) {
      setAccessNeedsLogin(true);
      setAccessError(copy.rating.wrongAccount);
      return;
    }

    setAccessNeedsLogin(false);
    setAccessError('');
    redirectedRef.current = true;
    router.replace(buildPlaygroundsRatingRoute(resolvedLink.bookingId));
  }, [
    copy.rating.requiresLogin,
    copy.rating.wrongAccount,
    copy.errors.ratingResolveFailed,
    resolvedLink,
    router,
    session.canRunUserActions,
    session.hydrated,
    session.userId,
  ]);

  const showLoader = resolveTokenQuery.isLoading && !resolvedLink;

  return (
    <AppScreen scroll contentContainerStyle={styles.container}>
      <ScreenHeader
        title={copy.rating.title}
        subtitle={copy.searchHint}
        onBack={() => router.replace(ROUTES.PLAYGROUNDS_HOME)}
        right={<LanguageSwitch compact />}
      />

      {showLoader ? <SectionLoader minHeight={160} /> : null}

      {!showLoader && resolveTokenQuery.error ? (
        <>
          <PlaygroundsErrorState
            title={copy.errors.ratingResolveFailed}
            error={resolveTokenQuery.error}
            fallbackMessage={resolvePlaygroundsErrorMessage(
              resolveTokenQuery.error,
              locale,
              copy.errors.ratingResolveFailed
            )}
            retryLabel={copy.actions.retry}
            onRetry={() => {
              setAccessError('');
              setAccessNeedsLogin(false);
              resolveCurrentToken({ refresh: true });
            }}
          />
          <Button fullWidth variant="secondary" onPress={() => router.replace(ROUTES.PLAYGROUNDS_HOME)}>
            {copy.actions.viewPlaygrounds}
          </Button>
        </>
      ) : null}

      {!showLoader && !resolveTokenQuery.error && accessError ? (
        <Surface variant="soft" padding="md" style={styles.accessCard}>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {accessError}
          </Text>

          {accessNeedsLogin ? (
            <Button
              fullWidth
              onPress={() =>
                router.push(
                  buildAuthLoginRoute(
                    AUTH_LOGIN_MODES.PUBLIC,
                    true,
                    loginRedirectPath
                  )
                )
              }
            >
              {copy.actions.loginToContinue}
            </Button>
          ) : null}

          <Button fullWidth variant="secondary" onPress={() => router.replace(ROUTES.PLAYGROUNDS_HOME)}>
            {copy.actions.viewPlaygrounds}
          </Button>
        </Surface>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  accessCard: {
    gap: spacing.sm,
  },
});
