
> sporhive-new-app@1.0.0 lint
> expo lint

env: load .env
env: export EXPO_PUBLIC_ENV_NAME EXPO_PUBLIC_API_BASE_URL EXPO_PUBLIC_GOOGLE_MAPS_API_KEY EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\app\(player)\_layout.jsx
  131:6  warning  React Hook useEffect has a missing dependency: 'animation'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\components\forms\PhoneField.jsx
  80:43  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  78 |   useEffect(() => {
  79 |     const next = toValueObject(value, options, defaultCountryCode);
> 80 |     if (next.countryCode !== countryCode) setCountryCode(next.countryCode);
     |                                           ^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  81 |     if (next.nationalNumber !== nationalNumber) setNationalNumber(next.nationalNumber);
  82 |   }, [countryCode, defaultCountryCode, nationalNumber, options, value]);
  83 |  react-hooks/set-state-in-effect

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\academyDiscovery\hooks\useAcademies.js
  211:9  warning  'receivedCount' is assigned a value but never used  no-unused-vars

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\academyDiscovery\screens\JoinAcademyScreen.jsx
  260:5  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  258 |   useEffect(() => {
  259 |     if (!attempted) return;
> 260 |     setErrors(validateJoinForm(form, copy));
      |     ^^^^^^^^^ Avoid calling setState() directly within an effect
  261 |   }, [attempted, copy, form]);
  262 |
  263 |   const requestFieldErrors = useMemo(  react-hooks/set-state-in-effect

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\auth\screens\LoginScreen.jsx
  125:5  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  123 |
  124 |   useEffect(() => {
> 125 |     setMode(requestedMode);
      |     ^^^^^^^ Avoid calling setState() directly within an effect
  126 |   }, [requestedMode]);
  127 |
  128 |   useEffect(() => {  react-hooks/set-state-in-effect

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\auth\screens\ResetPasswordScreen.jsx
  625:7  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  623 |     const remaining = getContextCooldownSeconds(resetContext);
  624 |     if (remaining > resendIn) {
> 625 |       setResendIn(remaining);
      |       ^^^^^^^^^^^ Avoid calling setState() directly within an effect
  626 |     }
  627 |   }, [getContextCooldownSeconds, resendIn, resetContext, step]);
  628 |  react-hooks/set-state-in-effect

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playerPortal\api\playerPortal.api.js
   986:11  warning  'academyId' is assigned a value but never used   no-unused-vars
  1033:11  warning  'headerText' is assigned a value but never used  no-unused-vars

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playerPortal\hooks\usePlayerPayments.js
  39:28  warning  Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `overviewQuery.overview.raw`, but the source dependencies were [overviewQuery.overview?.raw]. Inferred different dependency than source.

  37 |   const overviewQuery = usePlayerOverview({ auto: enabled, enabled });
  38 |
> 39 |   const payments = useMemo(() => {
     |                            ^^^^^^^
> 40 |     if (!overviewQuery.overview?.raw) return DEFAULT_PAYMENTS;
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 41 |
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 42 |     try {
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 43 |       return mapPaymentsFromOverview(overviewQuery.overview.raw);
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 44 |     } catch {
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 45 |       return DEFAULT_PAYMENTS;
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 46 |     }
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 47 |   }, [overviewQuery.overview?.raw]);
     | ^^^^ Could not preserve existing manual memoization
  48 |
  49 |   const items = useMemo(
  50 |     () => applyPaymentFilter(payments.items, filter),  react-hooks/preserve-manual-memoization

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playerPortal\hooks\usePlayerProfile.js
  33:5  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  31 |   useEffect(() => {
  32 |     if (!profileFromOverview) return;
> 33 |     setProfileSnapshot(profileFromOverview);
     |     ^^^^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  34 |   }, [profileFromOverview]);
  35 |
  36 |   const profile = profileSnapshot || profileFromOverview || null;  react-hooks/set-state-in-effect
  67:5  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  65 |     if (profile || isFetchingProfile || isUpdatingProfile) return;
  66 |     if (profileError) return;
> 67 |     fetchProfile();
     |     ^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  68 |   }, [
  69 |     fetchProfile,
  70 |     isFetchingProfile,                                         react-hooks/set-state-in-effect

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playerPortal\hooks\usePlayerProfileEditor.js
   63:7   warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  61 |       const shouldSyncInitial = getProfileDirtyKeys(initialDraft, next).length > 0;
  62 |       if (!shouldSyncDraft && !shouldSyncInitial) return;
> 63 |       setDraft(next);
     |       ^^^^^^^^ Avoid calling setState() directly within an effect
  64 |       setInitialDraft(next);
  65 |       setImageDraft(null);
  66 |     }                                                                                                                                                                                                                                                       react-hooks/set-state-in-effect
   79:28  warning  Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `imageDraft`, but the source dependencies were [draft, imageDraft?.uri, session.requestContext]. Inferred less specific property than source.

  77 |   const isDirty = dirtyKeys.length > 0;
  78 |
> 79 |   const imageUri = useMemo(() => {
     |                            ^^^^^^^
> 80 |     if (imageDraft?.uri) return imageDraft.uri;
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 81 |     return resolveProfileImageUri(draft, session.requestContext);
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 82 |   }, [draft, imageDraft?.uri, session.requestContext]);
     | ^^^^ Could not preserve existing manual memoization
  83 |
  84 |   const setFieldValue = useCallback((field, value) => {
  85 |     setDraft((prev) => {                                                                                                                                                                           react-hooks/preserve-manual-memoization
  165:35  warning  Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `imageDraft`, but the source dependencies were [draft, imageDraft?.base64, imageDraft?.fileSize, imageDraft?.mimeType, imageDraft?.uri, profileQuery]. Inferred less specific property than source.

  163 |   }, [initialDraft]);
  164 |
> 165 |   const saveProfile = useCallback(async () => {
      |                                   ^^^^^^^^^^^^^
> 166 |     const validation = validateProfileDraft(draft);
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 167 |     if (!validation.valid) {
      …
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 239 |     return result;
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 240 |   }, [draft, imageDraft?.base64, imageDraft?.fileSize, imageDraft?.mimeType, imageDraft?.uri, profileQuery]);
      | ^^^^ Could not preserve existing manual memoization
  241 |
  242 |   return {
  243 |     canFetch: session.canFetchOverview,  react-hooks/preserve-manual-memoization

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playerPortal\hooks\usePlayerRenewalFlow.js
  239:36  warning  Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `optionsQuery.data.courses`, but the source dependencies were [optionsQuery.data?.courses, overviewQuery.overview?.subscription?.availableCourses]. Inferred different dependency than source.

  237 |   }, [anchorISO, overviewQuery.overview?.subscription?.status]);
  238 |
> 239 |   const rawCourseOptions = useMemo(() => {
      |                                    ^^^^^^^
> 240 |     if ((optionsQuery.data?.courses || []).length > 0) {
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 241 |       return optionsQuery.data.courses.map(normalizeCourseOption);
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 242 |     }
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 243 |
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 244 |     return (overviewQuery.overview?.subscription?.availableCourses || []).map(normalizeCourseOption);
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 245 |   }, [optionsQuery.data?.courses, overviewQuery.overview?.subscription?.availableCourses]);
      | ^^^^ Could not preserve existing manual memoization
  246 |
  247 |   const rawGroupOptions = useMemo(() => {
  248 |     if ((optionsQuery.data?.groups || []).length > 0) {                                                    react-hooks/preserve-manual-memoization
  247:35  warning  Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `optionsQuery.data`, but the source dependencies were [optionsQuery.data?.groups, overviewQuery.overview?.subscription?.availableGroups]. Inferred less specific property than source.

  245 |   }, [optionsQuery.data?.courses, overviewQuery.overview?.subscription?.availableCourses]);
  246 |
> 247 |   const rawGroupOptions = useMemo(() => {
      |                                   ^^^^^^^
> 248 |     if ((optionsQuery.data?.groups || []).length > 0) {
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 249 |       return dedupeGroups(optionsQuery.data.groups.map(normalizeGroupOption));
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 250 |     }
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 251 |
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 252 |     return dedupeGroups((overviewQuery.overview?.subscription?.availableGroups || []).map(normalizeGroupOption));
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 253 |   }, [optionsQuery.data?.groups, overviewQuery.overview?.subscription?.availableGroups]);
      | ^^^^ Could not preserve existing manual memoization
  254 |
  255 |   const strictSubscriptionGroups = useMemo(
  256 |     () => rawGroupOptions.filter((group) => group.course_id === null),  react-hooks/preserve-manual-memoization
  270:32  warning  Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `optionsQuery.data`, but the source dependencies were [optionsQuery.data?.levels, overviewQuery.overview?.levels]. Inferred less specific property than source.

  268 |   );
  269 |
> 270 |   const levelOptions = useMemo(() => {
      |                                ^^^^^^^
> 271 |     if ((optionsQuery.data?.levels || []).length > 0) {
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 272 |       return optionsQuery.data.levels.map(normalizeLevelOption);
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 273 |     }
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 274 |
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 275 |     return (overviewQuery.overview?.levels || []).map(normalizeLevelOption);
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 276 |   }, [optionsQuery.data?.levels, overviewQuery.overview?.levels]);
      | ^^^^ Could not preserve existing manual memoization
  277 |
  278 |   const filteredCourseOptions = useMemo(
  279 |     () => filterCoursesAfterActiveSubscription(rawCourseOptions, overlapAnchorISO),                                                                                                                                                                                      react-hooks/preserve-manual-memoization
  456:17  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  454 |     if (!courseId) return;
  455 |     const valid = filteredCourseOptions.some((item) => sameId(item.value, courseId));
> 456 |     if (!valid) setCourseIdState('');
      |                 ^^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  457 |   }, [courseId, filteredCourseOptions]);
  458 |
  459 |   useEffect(() => {                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    react-hooks/set-state-in-effect
  462:17  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  460 |     if (!groupId) return;
  461 |     const valid = filteredGroupOptions.some((item) => sameId(item.value, groupId));
> 462 |     if (!valid) setGroupId('');
      |                 ^^^^^^^^^^ Avoid calling setState() directly within an effect
  463 |   }, [filteredGroupOptions, groupId]);
  464 |
  465 |   useEffect(() => {                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     react-hooks/set-state-in-effect
  471:19  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  469 |     const startOk = isISODate(startDate);
  470 |     const startISO = startOk ? startDate : todayISO;
> 471 |     if (!startOk) setStartDate(startISO);
      |                   ^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  472 |
  473 |     if (!endDate) {
  474 |       const nextEndISO = addMonthsISODate(startISO, 1);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     react-hooks/set-state-in-effect
  484:19  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  482 |     const startOk = isISODate(startDate);
  483 |     const nextStartISO = startOk ? maxISODate(startDate, anchorStartISO) : anchorStartISO || todayISO;
> 484 |     if (!startOk) setStartDate(nextStartISO);
      |                   ^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  485 |
  486 |     if (!endDate) {
  487 |       const seededEndDate = addMonthsISODate(nextStartISO, 1);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        react-hooks/set-state-in-effect
  590:9   warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  588 |
  589 |       if (boundedStartISO && boundedStartISO !== startDate) {
> 590 |         setStartDate(boundedStartISO);
      |         ^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  591 |       }
  592 |
  593 |       if ((nextEndISO || '') !== (endDate || '')) {                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   react-hooks/set-state-in-effect

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playerPortal\screens\PlayerFreezeScreen.jsx
  203:5  warning  'data' is assigned a value but never used                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  no-unused-vars
  241:5  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  239 |     });
  240 |
> 241 |     setStartDate(nextRange.startDate);
      |     ^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  242 |     setEndDate(nextRange.endDate);
  243 |     if (!nextRange.startDate || !nextRange.endDate) {
  244 |       setAllowAutoDateSeed(false);  react-hooks/set-state-in-effect

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playerPortal\screens\PlayerHomeScreen.jsx
  2:10  warning  'Pressable' is defined but never used      no-unused-vars
  4:3   warning  'CalendarClock' is defined but never used  no-unused-vars

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playerPortal\screens\PlayerNewsDetailScreen.jsx
  56:5  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  54 |   useEffect(() => {
  55 |     if (!newsId) return;
> 56 |     loadNewsItem();
     |     ^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  57 |   }, [loadNewsItem, newsId]);
  58 |
  59 |   const images = useMemo(() => item?.images || [], [item?.images]);  react-hooks/set-state-in-effect

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playerPortal\screens\PlayerPaymentInvoiceScreen.jsx
  85:5  warning  Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `overview`, but the source dependencies were [invoiceLanguage, overview?.player?.arabicName, overview?.player?.displayName, overview?.player?.englishName, payment, releaseDocument, session.requestContext, t, toast]. Inferred less specific property than source.

   83 |
   84 |   const loadInvoice = useCallback(
>  85 |     async ({
      |     ^^^^^^^^
>  86 |       silent = false,
      | ^^^^^^^^^^^^^^^^^^^^^
>  87 |       downloadAfterLoad = false,
      …
      | ^^^^^^^^^^^^^^^^^^^^^
> 167 |       }
      | ^^^^^^^^^^^^^^^^^^^^^
> 168 |     },
      | ^^^^^^ Could not preserve existing manual memoization
  169 |     [
  170 |       invoiceLanguage,
  171 |       overview?.player?.arabicName,  react-hooks/preserve-manual-memoization

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playerPortal\screens\PlayerPerformanceScreen.jsx
  136:9   warning  The 'leaderboard' logical expression could make the dependencies of useMemo Hook (at line 168) change on every render. To fix this, wrap the initialization of 'leaderboard' in its own useMemo() Hook                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       react-hooks/exhaustive-deps
  137:36  warning  Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `data`, but the source dependencies were [data?.leaderboard?.types, data?.types]. Inferred less specific property than source.

  135 |   const leaderboardGroupId = data?.leaderboard?.groupId ?? null;
  136 |   const leaderboard = data?.leaderboard?.items || [];
> 137 |   const leaderboardTypes = useMemo(() => {
      |                                    ^^^^^^^
> 138 |     const leaderboardItems = Array.isArray(data?.leaderboard?.types) ? data.leaderboard.types : [];
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 139 |     if (leaderboardItems.length > 0) return leaderboardItems;
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 140 |     return Array.isArray(data?.types) ? data.types : [];
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 141 |   }, [data?.leaderboard?.types, data?.types]);
      | ^^^^ Could not preserve existing manual memoization
  142 |   const currentPlayerId = Number(data?.currentPlayerId || 0) || null;
  143 |   const hasPerformanceData = Boolean(data?.hasPerformanceData);
  144 |   const hasLeaderboardData = Boolean(data?.hasLeaderboardData) && leaderboard.length > 0;  react-hooks/preserve-manual-memoization
  137:36  warning  Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `data`, but the source dependencies were [data?.leaderboard?.types, data?.types]. Inferred less specific property than source.

  135 |   const leaderboardGroupId = data?.leaderboard?.groupId ?? null;
  136 |   const leaderboard = data?.leaderboard?.items || [];
> 137 |   const leaderboardTypes = useMemo(() => {
      |                                    ^^^^^^^
> 138 |     const leaderboardItems = Array.isArray(data?.leaderboard?.types) ? data.leaderboard.types : [];
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 139 |     if (leaderboardItems.length > 0) return leaderboardItems;
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 140 |     return Array.isArray(data?.types) ? data.types : [];
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 141 |   }, [data?.leaderboard?.types, data?.types]);
      | ^^^^ Could not preserve existing manual memoization
  142 |   const currentPlayerId = Number(data?.currentPlayerId || 0) || null;
  143 |   const hasPerformanceData = Boolean(data?.hasPerformanceData);
  144 |   const hasLeaderboardData = Boolean(data?.hasLeaderboardData) && leaderboard.length > 0;  react-hooks/preserve-manual-memoization
  173:7   warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  171 |     const hasSelectedMetric = leaderboardMetricOptions.some((option) => option.key === selectedLeaderboardMetric);
  172 |     if (!hasSelectedMetric) {
> 173 |       setSelectedLeaderboardMetric(LEADERBOARD_METRIC_OVERALL);
      |       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  174 |     }
  175 |   }, [leaderboardMetricOptions, selectedLeaderboardMetric]);
  176 |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         react-hooks/set-state-in-effect

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playerPortal\screens\PlayerProfileEditScreen.jsx
  112:5  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  110 |
  111 |   useEffect(() => {
> 112 |     setPickerError(null);
      |     ^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  113 |   }, [profileEditor.imageUri]);
  114 |
  115 |   const submit = async () => {  react-hooks/set-state-in-effect

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playerPortal\screens\PlayerStoreCatalogScreen.jsx
  4:10  warning  'ChevronRight' is defined but never used  no-unused-vars
  4:44  warning  'PackageCheck' is defined but never used  no-unused-vars

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playerPortal\screens\PlayerStoreOrderDetailsScreen.jsx
  19:3  warning  'PortalStatusBadge' is defined but never used      no-unused-vars
  21:3  warning  'UniformStatusTimeline' is defined but never used  no-unused-vars
  98:9  warning  'statusLabel' is assigned a value but never used   no-unused-vars

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playerPortal\screens\PlayerStoreOrdersScreen.jsx
   22:3  warning  'PortalStatusBadge' is defined but never used       no-unused-vars
   40:9  warning  'statusLabel' is assigned a value but never used    no-unused-vars
  123:9  warning  'statusPreview' is assigned a value but never used  no-unused-vars

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playerPortal\screens\PlayerStoreProductScreen.jsx
  64:5  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  62 |     if (!product) return;
  63 |     const preferred = product.variants.find((item) => item.inStock) || product.variants[0] || null;
> 64 |     setVariantId(preferred?.id || null);
     |     ^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  65 |   }, [product]);
  66 |
  67 |   const selectedVariant = useMemo(                                                                        react-hooks/set-state-in-effect
  75:5  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  73 |     if (!selectedVariant) return;
  74 |     const max = Math.max(1, Number(selectedVariant.quantity || 1));
> 75 |     setQuantity((prev) => Math.max(1, Math.min(prev, max)));
     |     ^^^^^^^^^^^ Avoid calling setState() directly within an effect
  76 |   }, [selectedVariant]);
  77 |
  78 |   const showLoading = canFetch && (isLoading || (!lastUpdatedAt && !error)) && products.length === 0;  react-hooks/set-state-in-effect

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playerPortal\utils\playerPortal.invoice.js
  158:9   warning  'byteLength' is assigned a value but never used      no-unused-vars
  246:13  warning  'sourceFileInfo' is assigned a value but never used  no-unused-vars

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playgrounds\screens\PlaygroundBookingScreen.jsx
  218:5   warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  216 |     const defaultDuration =
  217 |       durations.find((item) => item.isDefault) || durations[0];
> 218 |     setSelectedDurationId(defaultDuration?.id || "");
      |     ^^^^^^^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  219 |   }, [durations, selectedDurationId]);
  220 |
  221 |   useEffect(() => {  react-hooks/set-state-in-effect
  224:5   warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  222 |     if (!venue) return;
  223 |     if (playersCount > 0) return;
> 224 |     setPlayersCount(Math.max(venue.minPlayers || 1, 1));
      |     ^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  225 |   }, [playersCount, venue]);
  226 |
  227 |   const selectedDuration = useMemo(                                 react-hooks/set-state-in-effect
  280:25  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  278 |   useEffect(() => {
  279 |     if (!availableSlots.length) {
> 280 |       if (selectedSlot) setSelectedSlot(null);
      |                         ^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  281 |       return;
  282 |     }
  283 |                                                                        react-hooks/set-state-in-effect
  309:9   warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  307 |     if (paymentType === "cliq" && !allowCliq) {
  308 |       if (allowCash) {
> 309 |         setPaymentType("cash");
      |         ^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  310 |       } else {
  311 |         setPaymentType("");
  312 |       }                                                        react-hooks/set-state-in-effect

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playgrounds\screens\PlaygroundMyBookingsScreen.jsx
  24:3  warning  'buildPlaygroundsRatingRoute' is defined but never used  no-unused-vars

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playgrounds\screens\PlaygroundRatingTokenScreen.jsx
   88:7  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  86 |   useEffect(() => {
  87 |     if (!resolvedToken) {
> 88 |       setResolvedLink(null);
     |       ^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  89 |       setAccessNeedsLogin(false);
  90 |       setAccessError(copy.errors.ratingResolveFailed);
  91 |       return;  react-hooks/set-state-in-effect
  107:7  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  105 |
  106 |     if (!tokenUserId) {
> 107 |       setAccessNeedsLogin(false);
      |       ^^^^^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  108 |       setAccessError(copy.errors.ratingResolveFailed);
  109 |       return;
  110 |     }                                    react-hooks/set-state-in-effect

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playgrounds\screens\PlaygroundVenueScreen.jsx
  155:9  warning  The 'venueRaw' logical expression could make the dependencies of useMemo Hook (at line 169) change on every render. To fix this, wrap the initialization of 'venueRaw' in its own useMemo() Hook  react-hooks/exhaustive-deps
  155:9  warning  The 'venueRaw' logical expression could make the dependencies of useMemo Hook (at line 182) change on every render. To fix this, wrap the initialization of 'venueRaw' in its own useMemo() Hook  react-hooks/exhaustive-deps
  155:9  warning  The 'venueRaw' logical expression could make the dependencies of useMemo Hook (at line 196) change on every render. To fix this, wrap the initialization of 'venueRaw' in its own useMemo() Hook  react-hooks/exhaustive-deps
  155:9  warning  The 'venueRaw' logical expression could make the dependencies of useMemo Hook (at line 209) change on every render. To fix this, wrap the initialization of 'venueRaw' in its own useMemo() Hook  react-hooks/exhaustive-deps
  155:9  warning  The 'venueRaw' logical expression could make the dependencies of useMemo Hook (at line 214) change on every render. To fix this, wrap the initialization of 'venueRaw' in its own useMemo() Hook  react-hooks/exhaustive-deps
  155:9  warning  The 'venueRaw' logical expression could make the dependencies of useMemo Hook (at line 234) change on every render. To fix this, wrap the initialization of 'venueRaw' in its own useMemo() Hook  react-hooks/exhaustive-deps
  159:9  warning  'description' is assigned a value but never used                                                                                                                                                  no-unused-vars
  247:5  warning  React Hook useMemo has a missing dependency: 'copy.labels.price'. Either include it or remove the dependency array                                                                                react-hooks/exhaustive-deps

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playgrounds\screens\PlaygroundsIndexScreen.jsx
    1:30  warning  'useRef' is defined but never used                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         no-unused-vars
  324:6   warning  React Hook useEffect has a missing dependency: 'animation'. Either include it or remove the dependency array                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               react-hooks/exhaustive-deps
  447:5   warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  445 |
  446 |   useEffect(() => {
> 447 |     setActiveTab(routeInitialState.activeTab);
      |     ^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  448 |     setFilters(routeInitialState.filters);
  449 |     setAppliedFilters(routeInitialState.filters);
  450 |     setHasSearched(false);  react-hooks/set-state-in-effect

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playgrounds\screens\PlaygroundsMapScreen.jsx
  212:5  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  210 |
  211 |   useEffect(() => {
> 212 |     setViewportFilters({});
      |     ^^^^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  213 |     clearAppliedViewport();
  214 |   }, [baseFiltersSignature, clearAppliedViewport]);
  215 |                                react-hooks/set-state-in-effect
  218:7  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  216 |   useEffect(() => {
  217 |     if (!mapVenues.length) {
> 218 |       setSelectedVenueId('');
      |       ^^^^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  219 |       return;
  220 |     }
  221 |                                                           react-hooks/set-state-in-effect
  235:5  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

  233 |     if (!mapVenues.length) return;
  234 |
> 235 |     setFitToResultsVersion((prev) => prev + 1);
      |     ^^^^^^^^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  236 |
  237 |     const bounds = buildBoundsFromVenues(mapVenues);
  238 |     if (bounds) {  react-hooks/set-state-in-effect

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\public\screens\PublicHomePlaceholderScreen.jsx
  62:5  warning  Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `user`, but the source dependencies were [locale, user?.first_name]. Inferred less specific property than source.

  60 |
  61 |   const copy = useMemo(
> 62 |     () =>
     |     ^^^^^
> 63 |       locale === 'ar'
     | ^^^^^^^^^^^^^^^^^^^^^
> 64 |         ? {
     …
     | ^^^^^^^^^^^^^^^^^^^^^
> 94 |               'Browse venues, pick your preferred slot, and confirm bookings smoothly.',
     | ^^^^^^^^^^^^^^^^^^^^^
> 95 |           },
     | ^^^^^^^^^^^^ Could not preserve existing manual memoization
  96 |     [locale, user?.first_name]
  97 |   );
  98 |  react-hooks/preserve-manual-memoization

✖ 67 problems (0 errors, 67 warnings)

