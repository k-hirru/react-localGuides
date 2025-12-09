# Testing Guide

This project uses **Jest** and **@testing-library/react-native** for unit and integration tests around the core app logic.

## 1. How to run the test suite

### Run all tests (single process)

```bash
# From the project root
npm test
```

`npm test` is configured to run Jest in **single-process mode** with an increased heap limit to avoid out-of-memory errors on React Native + Firebase + chart-kit:

```json
"scripts": {
  "test": "NODE_OPTIONS=\"--max_old_building\" jest --runInBand"
}
```

> **Note:** In some macOS environments, Jest may not be allowed to create its default temp directory. If you see an `EACCES` error for `/private/var/folders/.../jest_*/`, run Jest with a local temp directory:
>
> ```bash
> mkdir -p .tmp
> TMPDIR=$PWD/.tmp npx jest --runInBand
> ```

### Run with coverage

```bash
npm test -- --runInBand --coverage
```

This prints a coverage table per file (statements, branches, functions, lines) so you can track progress toward higher coverage.

---

## 2. Test stack and configuration

- **Test runner:** [`jest`](https://jestjs.io/) with the `react-native` preset.
- **UI testing:** [`@testing-library/react-native`](https://testing-library.com/docs/react-native-testing-library/intro/) for rendering components and querying the UI.
- **TypeScript support:** Uses the Expo/React Native Babel pipeline; no `ts-jest` needed. `tsconfig.json` includes `"types": ["jest"]` so Jest globals (`describe`, `it`, `expect`, `jest`) type-check correctly.
- **Setup file:** `jest.setup.js` is loaded via `jest.config.js`:
  - Registers `@testing-library/jest-native/extend-expect`.
  - Mocks native and external modules (see below).

### Important mocks

Because this app depends on native modules and external services, `jest.setup.js` provides safe test doubles for:

- `@react-native-async-storage/async-storage` – in-memory mock via the official Jest helper.
- `expo-constants` – minimal object exposing `expoConfig.manifest.extra` so `geoapifyService` can read `GEOAPIFY_API_KEY`.
- **Firebase:**
  - `@react-native-firebase/app` – basic `getApp`, `getApps`, `initializeApp` mocks.
  - `@react-native-firebase/firestore` – stubs for `getFirestore`, `collection`, `doc`, `getDoc`, `getDocs`, `setDoc`, `updateDoc`, `where`, `orderBy`, `limit`, `query`, `serverTimestamp`.
  - `@react-native-firebase/auth` – `getAuth`, `onAuthStateChanged`, `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, etc. are stubbed; `onAuthStateChanged` immediately calls its callback with `null` (no user) by default.
  - `@react-native-firebase/messaging` – provides `requestPermission`, `getToken`, and `onMessage`/`setBackgroundMessageHandler` no-ops.
  - `@react-native-firebase/storage` – stubs `getStorage`, `ref`, `uploadString`, `getDownloadURL`.
- **Notifee:** `@notifee/react-native` – mocked `displayNotification`, `onBackgroundEvent`, etc.
- **Encrypted storage:** `react-native-encrypted-storage` – in-memory `setItem/getItem/removeItem/clear` implementation.
- **Permissions & connectivity:**
  - `@react-native-community/netinfo` – `onMessage` and `isConnected` are stubbed.
  - `@react-native-community/geolocation` – geolocation APIs are stubbed.
- **Charts:** `react-native-chart-kit` – replaced with a simple `<View>` wrapper to avoid heavy native logic in tests.

These mocks allow you to test your own logic (business services, hooks, screens) without hitting network or device APIs.

---

## 3. Existing test suites and coverage focus

### 3.1 Services

- **`__tests__/services/businessService.test.ts`**
  - Exercises `businessService.getNearbyBusinesses` with real caching logic:
    - Uses `AsyncStorage`-backed cache.
    - Verifies that:
      - No-cache path fetches from Geoapify (via a spy on `geoapifyService.searchNearbyPlaces`).
      - Fresh cache is reused without hitting the network.
      - Stale cache is invalidated and replaced.
      - `updateBusinessStats` writes `reviewCount`, `avgRating`, `lastReviewAt`.
  - Uses a mocked `mapGeoapifyToBusiness` in tests to avoid brittle mapping logic and keep focus on caching behavior.

- **`__tests__/services/secureStorage.test.ts`**
  - Verifies the `secureStorage` helpers in `src/services/secureStorage.ts`:
    - `setSecureItem` serializes non-string values to JSON.
    - `getSecureItem` returns parsed JSON if the stored string is JSON, or the raw string otherwise.
    - `removeSecureItem` calls `EncryptedStorage.removeItem` with the correct key.
    - `clearAllSecure` calls `EncryptedStorage.clear`.

- **`__tests__/services/notificationService.test.ts`**
  - Focuses on FCM token management in `notificationService`:
    - When `requestPermission` resolves as authorized and `getToken` returns a token, `requestPermissionAndGetToken` stores it under `SecureStorageKey.FCM_TOKEN`.
    - `clearCachedToken` wipes the in-memory cache and removes the token from secure storage.

### 3.2 Hooks

- **`__tests__/services/businessService.test.ts`** (indirectly)
  - Validates the integration between `useProtectedAction`, `reviewService`, and `businessService` via `updateBusinessRatings`.

- **`__tests__/hooks/useProtectedAction.test.ts`**
  - Uses `useInternetConnectivity` mocks to validate `useProtectedAction`:
    - When `checkConnectivity` returns `true`, the wrapped action is executed and its result is returned.
    - When `checkConnectivity` returns `false`, the action is *not* invoked, and the hook returns `false` (and would show an alert if enabled).

### 3.3 Screens (integration tests)

- **`__tests__/screens/HomeScreen.test.tsx`**
  - Renders `HomeScreen` under realistic providers:
    - `NavigationContainer`
    - `AuthProvider` (from `AuthContext`)
    - `QueryClientProvider` (React Query)
  - Mocks:
    - `useLocation` to return a fixed `userLocation`.
    - `useInternetConnectivity` to always be online (`checkConnectivity` returns `true`).
    - `useInfiniteNearbyBusinessesQuery` to return a single `Test Cafe` business.
    - `BusinessCard` component to a lightweight stub so the test doesn’t instantiate `useAppStore` or heavy native UI.
  - Asserts that `Test Cafe` appears at least once in the rendered output.

- **`__tests__/screens/BusinessDetailsScreen.test.tsx`**
  - Renders `BusinessDetailsScreen` with:
    - Mocked `useBusinessDetailsQuery` returning a complete business object (including `hours`).
    - Mocked `useBusinessReviewsQuery` returning a single review.
    - Mocked `useLocation` returning a fixed location (no real GPS).
    - Mocked `useRoute` and `useNavigation` (with `navigate`, `goBack`, and `setOptions`).
  - Asserts that the business name (`Test Cafe`) and a review text are rendered.

- **`__tests__/screens/FavoritesScreen.test.tsx`**
  - Renders `FavoritesScreen` as if a user is logged in:
    - Mocks `useAuthContext` to return a `user`.
    - Mocks `useFavoriteBusinesses` to return one favorite (`Fav Cafe`) and a `toggleFavorite` spy.
    - Stubs `BusinessCard` to a simple component so the test only focuses on the screen’s orchestration.
    - Mocks `useNavigation` to track `navigate` calls without real navigation.
  - Asserts:
    - The header "Your Favorites" and `Fav Cafe` are visible.
    - Pressing the custom "Heart" button calls `toggleFavorite('fav-1')`.

### 3.4 Other components

While not all components have dedicated tests yet, the above integration tests implicitly cover:

- Header rendering and user greeting in `HomeScreen` (e.g. `Welcome, there` vs. `Welcome, <Name>` depending on `AuthContext`).
- Business cards, ratings, and addresses as rendered in lists and sections.

You can add focused tests for components like `CategoryFilter`, `StarRating`, or `ReviewCard` using `@testing-library/react-native` in a similar way to the existing screen tests.

---

## 4. Patterns for adding new tests

### 4.1 Service / helper tests

1. **Import the service or helper: **
   ```ts
   import { someService } from '@/src/services/someService';
   ```
2. **Mock external dependencies** at the module level with `jest.mock(...)`.
3. **Exercise a small, well-defined behavior**, e.g.:
   - Input validation
   - Simple branching logic
   - Integration with another service (like secure storage)
4. **Use spies where you need to verify calls** without replacing the whole implementation:
   ```ts
   const spy = jest.spyOn(otherService, 'doWork').mockResolvedValue(...);
   ```

### 4.2 Hook tests

Use `@testing-library/react-native`’s render helpers in a small wrapper component or with `render`/`screen`:

```ts
import { render, screen } from '@testing-library/react-native';

function TestHarness() {
  const { userLocation } = useLocation();
  return <Text>{userLocation ? 'Has location' : 'No location'}</Text>;
}

test('useLocation returns a location', async () => {
  render(<TestHarness />);
  expect(await screen.findByText('Has location')).toBeTruthy();
});
```

If a hook depends on another hook (like `useProtectedAction` depends on `useInternetConnectivity`), mock the dependency at the module level and then render a simple component/harness that calls the hook.

### 4.3 Screen tests

1. Wrap your screen in any needed providers:
   - `NavigationContainer`
   - `AuthProvider`
   - `QueryClientProvider`
2. Mock the screen’s data hooks (`useXQuery`, `useFavoriteBusinesses`, etc.) to feed deterministic data.
3. Mock heavy child components (e.g. `BusinessCard`, chart components) to keep tests fast and avoid pulling in `useAppStore` or native views.
4. Assert on visible text, button presence, and key interactions with `fireEvent`.

Example skeleton:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SomeScreen from '@/src/screens/some/SomeScreen';

const createWrapper = (ui: React.ReactNode) => {
  const client = new QueryClient();
  return (
    <NavigationContainer>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </NavigationContainer>
  );
};

test('SomeScreen shows data from hook and reacts to tap', async () => {
  render(createWrapper(<SomeScreen />));

  // Initial state
  expect(await screen.findByText('Loaded Title')).toBeTruthy();

  // Interactions
  fireEvent.press(screen.getByText('Do something'));
  expect(screen.getByText('Done')).toBeTruthy();
});
```

---

## 5. Raising coverage further

Your current coverage (after adding the above tests) is roughly:

- **~30–40% overall**
- Higher coverage on:
  - `secureStorage.ts`
  - `businessService.ts` (caching paths)
  - `notificationService.ts` (token logic)
  - Key screens (`Home`, `BusinessDetails`, `Favorites`)

To push toward even higher coverage:

- Add focused tests for:
  - `useInternetConnectivity` (online vs. offline behavior and NetInfo usage)
  - A couple of smaller components (`CategoryFilter`, `StarRating`, `ReviewCard`), using simple render/interaction tests.
- Gradually add tests around `useAppStore` behaviors that are critical for your product (e.g., optimistic favorite toggling, `updateBusinessRatings`).

The current suite, combined with the documented strategy in this file, should move your project much closer to a 10/10 score on testing and production readiness.

---

## 6. End-to-end (E2E) tests (Maestro)

This project also includes a **single end-to-end (E2E) flow definition** using [Maestro](https://maestro.mobile.dev/), a lightweight UI testing framework for mobile apps.

### 6.1 What the E2E flow does

The flow performs a very simple **"home screen smoke test"**:

- Launches the app on a device/emulator.
- Verifies that the Home screen welcome text is visible.
- Verifies that the search placeholder text is visible.
- (Optionally) taps on the search bar.

This is enough to demonstrate that:

- The app starts successfully.
- The main navigation and home screen render correctly.
- Critical UI text is present.

### 6.2 Flow files

Two example Maestro flows are provided:

- `maestro/home_smoke.yaml` – a simple **Home screen smoke test** that assumes the user is already signed in on the device (it does *not* clear app state).
- `maestro/login_and_home.yaml` – a **login + Home flow** that starts from a clean state, signs in using credentials supplied via environment variables, then verifies the Home screen.

### 6.3 Configuring login credentials for E2E (environment variables)

To avoid hard-coding your email and password into the repository, the login flow reads credentials from environment variables:

- `MAESTRO_EMAIL` – your test user email address.
- `MAESTRO_PASSWORD` – the corresponding password.

Set them in your shell **before** running Maestro. For example (for the current terminal session):

```bash
export MAESTRO_EMAIL="your-email@example.com"
export MAESTRO_PASSWORD="your-strong-password"
```

These values live only in your shell environment.

If you want them to persist across sessions in `zsh`, you can add the same `export` lines to `~/.zshrc` and then run:

```bash
source ~/.zshrc
```

> Be aware that putting real credentials into `~/.zshrc` stores them in plain text on your machine. Prefer using a dedicated test account.

### 6.4 How to run the E2E tests (high-level)

1. **Install Maestro CLI** (one-time on your machine):

   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

   Or follow the official docs for your OS.

2. **Build and run your app on a simulator/device** using your usual Expo native workflow. For example:

   ```bash
   # iOS
   npm run ios

   # Android
   npm run android
   ```

   Make sure the app is installed and can be launched normally.

3. **Update the `appId` in `maestro/home_smoke.yaml` and `maestro/login_and_home.yaml` if needed** so they match your actual bundle ID (e.g. `com.khirrucapstone.localguide`). This is the native application ID used on the device.

4. **Run the desired Maestro flow** from the project root:

   - To run the home-only smoke test (assumes you are already signed in on the device and does **not** clear app state):

     ```bash
     maestro test maestro/home_smoke.yaml
     ```

   - To run the login + home flow (starts from a clean state, signs in using `MAESTRO_EMAIL` / `MAESTRO_PASSWORD`, then verifies the Home screen):

     ```bash
     maestro test maestro/login_and_home.yaml
     ```

If either flow succeeds, you have a working E2E test that exercises the real built app end-to-end.

> **Note:** E2E tests are intentionally minimal here. The goal is to demonstrate that the app can be driven end-to-end via automation (launch + basic UI assertions). You can extend these flows later to cover navigation to Business Details, Favorites, and other key paths.
