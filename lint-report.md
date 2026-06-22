
> sporhive-new-app@1.0.0 lint
> expo lint

env: load .env
env: export EXPO_PUBLIC_ENV_NAME EXPO_PUBLIC_API_BASE_URL EXPO_PUBLIC_GOOGLE_MAPS_API_KEY EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN

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

C:\Users\Dell\Desktop\SporHive\sporhive-new-app\src\features\playgrounds\screens\PlaygroundVenueScreen.jsx
  155:9  warning  The 'venueRaw' logical expression could make the dependencies of useMemo Hook (at line 169) change on every render. To fix this, wrap the initialization of 'venueRaw' in its own useMemo() Hook  react-hooks/exhaustive-deps
  155:9  warning  The 'venueRaw' logical expression could make the dependencies of useMemo Hook (at line 183) change on every render. To fix this, wrap the initialization of 'venueRaw' in its own useMemo() Hook  react-hooks/exhaustive-deps
  155:9  warning  The 'venueRaw' logical expression could make the dependencies of useMemo Hook (at line 196) change on every render. To fix this, wrap the initialization of 'venueRaw' in its own useMemo() Hook  react-hooks/exhaustive-deps
  155:9  warning  The 'venueRaw' logical expression could make the dependencies of useMemo Hook (at line 201) change on every render. To fix this, wrap the initialization of 'venueRaw' in its own useMemo() Hook  react-hooks/exhaustive-deps
  155:9  warning  The 'venueRaw' logical expression could make the dependencies of useMemo Hook (at line 221) change on every render. To fix this, wrap the initialization of 'venueRaw' in its own useMemo() Hook  react-hooks/exhaustive-deps
  234:5  warning  React Hook useMemo has a missing dependency: 'copy.labels.price'. Either include it or remove the dependency array                                                                                react-hooks/exhaustive-deps

✖ 7 problems (0 errors, 7 warnings)

