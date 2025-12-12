# Local Guides / Resto Finder App

A React Native + Expo application for discovering nearby restaurants, cafes, and fast food spots, with business data from **Geoapify** and user-generated reviews and analytics stored in **Firebase**.

The app features:

- Authenticated users (email/password) with roles (`user` / `admin`).
- A home screen that surfaces nearby places, top-rated spots, and trending businesses.
- Business details with hours, reviews, and helpful-vote functionality.
- Favorites and profile screens.
- An admin dashboard for high-level analytics.

This README focuses on **setup**, **architecture/structure**, **API integration**, and **testing**.

---

## 1. Getting Started

### 1.1 Prerequisites

- Node.js and npm (LTS recommended)
- Expo tooling (`npx expo` will be installed on the fly)
- iOS simulator (Xcode) and/or Android emulator/physical device

### 1.2 Install dependencies

From the project root:

```bash
npm install
```

### 1.3 Environment configuration

Secrets and API keys are configured via `.env` and consumed in `app.config.js` / `expo-constants`.

You should have a `.env` file with entries similar to:

```bash
# Firebase
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...

# Geoapify
GEOAPIFY_API_KEY=...
```

These are read in `app.config.js` and exposed via `Constants.expoConfig?.extra` so services like `geoapifyService` and Firebase clients can access them.

> Do not commit real credentials. Use a separate `.env.example` file when sharing the project.

### 1.4 Running the app

```bash
# iOS simulator
npm run expo:ios

# Android emulator / device
npm run expo:android

# Metro / dev server
npm expo start
```

Expo will take care of bundling and launching the app on the chosen platform.

---

## 2. Project Structure & Architecture

All application code lives under `src/`, grouped by responsibility:

```text
src/
  assets/         # App-specific static assets (images, icons, etc.)
  components/     # Reusable presentational components
  config/         # App config helpers
  constants/      # UI + domain constants (e.g. categories, colors)
  context/        # React context providers (Auth, etc.)
  hooks/          # App-specific hooks (stateful + data/hooks)
  navigation/     # Navigation stacks and tab navigators
  screens/        # Screen-level components (pages)
  services/       # Business/domain logic and API integration
  types/          # Shared TypeScript types
  utils/          # Pure utility functions (e.g. mappers)
```

### 2.1 Screens

`src/screens/*` contains the main app screens. Examples:

- `src/screens/home/index.tsx` – Home screen showing:
  - Welcome header (based on `AuthContext` / profile name).
  - Search bar (navigates to Explore).
  - Category filter.
  - Top Rated and Popular Nearby horizontal carousels.
  - Main list of nearby places (driven by React Query + Geoapify + review stats).
- `src/screens/entry/SignUpScreen.tsx` – Email/password signup flow using `useAuthContext().signup`.
- `src/screens/favorites/favorites.tsx` – User’s favorites list using favorites hooks.
- `src/screens/admin/AdminDashboardScreen.tsx` – Admin-only analytics view.

Screens are primarily responsible for **layout and composition**:

- They connect to hooks and context (`useAuthContext`, query hooks, etc.).
- They render reusable components (`BusinessCard`, `CategoryFilter`, `ReviewCard`, etc.).
- They handle navigation via `@react-navigation/native`.

### 2.2 Components

`src/components/*` contains reusable UI pieces that are mostly stateless or lightly stateful:

- `BusinessCard.tsx` – Compact card for a business (image, name, rating, etc.).
- `CategoryFilter.tsx` – Horizontal filters for "All", "Restaurants", "Cafes", etc.
- `StarRating.tsx` – Visual star rating display.
- `ReviewCard.tsx` – Presentation for a single review.
- `StyledInput.tsx`, `FormContainer.tsx`, `KeyboardAvoidingScrollView.tsx` – Auth/form helpers.
- `findingPlacesLoader.tsx` – Loading skeleton/animation for searching places.

These components receive data and callbacks as props and do not perform network calls.

### 2.3 Hooks

`src/hooks/*` contains application-specific hooks that encapsulate **stateful logic** and **business rules** used by multiple screens.

Key examples:

- `useAuth.ts` – Wraps Firebase Auth and Firestore user docs:
  - Tracks `user`, `loading`, `error`, `userRole`, and `profileName`.
  - Exposes `login`, `signup`, `logout`, and `resetPassword`.
  - Stores FCM tokens in Firestore via `notificationService` and `updateUserFcmToken`.
  - Used by `AuthContext` to provide auth state/app role across the app.
- `useProtectedAction.ts` – Wraps actions with connectivity checks, used to guard network operations.
- `useInternetConnectivity.ts` – Wraps NetInfo into a simple, testable hook for online/offline status.
- `hooks/queries/useNearbyBusinessesQuery.ts` – React Query hooks over `businessService`:
  - `useNearbyBusinessesQuery` – single-page nearby fetch with caching.
  - `useInfiniteNearbyBusinessesQuery` – infinite scroll over Geoapify places.
  - `useRefreshNearbyBusinesses` – explicit refresh that bypasses AsyncStorage cache.
- `useHomeBusinesses.ts` – Feature hook that composes connectivity, location, infinite nearby businesses, and client-side filtering (category + search) into a single, reusable data facade for `HomeScreen`.
- `useLocation.ts` – Encapsulates reading and refreshing the user’s location.

These hooks form the middle “service-to-UI” layer that keeps screens thinner.

### 2.4 Services (Business/Domain Layer)

`src/services/*` handles external APIs and business/aggregation logic.

- `businessService.ts`
  - Orchestrates business discovery:
    - Calls `geoapifyService.searchNearbyPlaces` with mapped categories.
    - Aggregates review stats with `reviewService.getBusinessesWithReviews`.
    - Maps raw Geoapify places to internal `Business` models using `mapGeoapifyToBusiness`.
  - Implements cross-session caching in AsyncStorage (cache key + TTL) for nearby searches.
  - Provides paginated `getNearbyBusinessesPage` for infinite scroll.
  - Upserts canonical `businesses` documents in Firestore for analytics.

- `geoapifyService.ts`
  - Wraps the Geoapify Places API:
    - `searchNearbyPlaces` – places near a lat/lon with category filters and radius.
    - `getPlaceDetails` – single place details by `place_id`.
    - `searchPlacesByName` – name-based search endpoint.
  - Handles:
    - URL building (categories, filters, offsets/limits).
    - Response transformation into `GeoapifyPlace` objects (coordinates, address, cuisine/brand, etc.).
    - In-memory caching and pending-request deduplication.

- `reviewService.ts`
  - Handles review CRUD and aggregation:
    - `addReview`, `updateReview`, `deleteReview`.
    - `getReviewsForBusiness`, `getUserReviews`.
    - `getBusinessesWithReviews` – aggregates average rating + count per business.
    - Helpful votes: `addHelpfulVote`, `removeHelpfulVote`, `hasUserVoted`, `updateReviewHelpfulCount`.
  - Integrates with `imageService` to delete review images from Storage upon review deletion.

- `imageService.ts`
  - Uploads and deletes images to/from Firebase Storage:
    - `uploadImage` – takes base64 data, builds a user- and type-specific path, uploads, returns a download URL.
    - `deleteImage` – deletes a single image (with auth guard).
    - `deleteImages` – utility to delete multiple images resiliently.

- `notificationService.ts`
  - Manages Notifee + FCM tokens:
    - `requestPermissionAndGetToken` – debounced permission/token request with secure storage.
    - `clearCachedToken`, `getCurrentToken`.
    - Foreground/background handlers for notification events.

- `secureStorage.ts`
  - Wraps `react-native-encrypted-storage` with typed helpers for storing/retrieving/removing secure config and tokens.

These services deliberately avoid UI concerns, making them easier to test and reason about.

### 2.5 Context

`src/context/AuthContext.tsx` provides a single `AuthProvider` and `useAuthContext` hook:

- Wraps `useAuth()` and surfaces:
  - `user`, `loading`, `error`.
  - `login`, `signup`, `logout`, `resetPassword`.
  - `role`, `isAdmin`, `profileName`.
- All screens that need auth information or role checks use `useAuthContext()` instead of talking to Firebase directly.

### 2.6 Utils

`src/utils/*` contains small, focused helpers:

- `businessMapper.ts` – `mapGeoapifyToBusiness` converts raw `GeoapifyPlace` + review stats into your `Business` domain type:
  - Picks a category (restaurant/cafe/fast_food) based on Geoapify categories.
  - Estimates price level.
  - Builds placeholder images and opening hours if not provided.
  - Derives features from cuisines, brands, and categories.

These helpers are pure functions and are heavily unit-tested.

---

## 3. State Management

The app uses a combination of **React Query**, **custom hooks/contexts**, and a small client-side store to manage state.

- **Server state (remote data):**
  - React Query hooks (e.g. `useNearbyBusinessesQuery`, `useInfiniteNearbyBusinessesQuery`, `useBusinessDetailsQuery`, `useBusinessReviewsQuery`) fetch and cache data from Geoapify and Firebase.
  - These hooks always talk to the API via services (`businessService`, `geoapifyService`, `reviewService`, etc.) so that network logic is not embedded in screens.
- **Client state (UI + derived state):**
  - `AuthContext` + `useAuth` manage the authenticated user, role (`user` / `admin`), and profile name.
  - `useHomeBusinesses` is a feature hook for Home that composes:
    - Connectivity (`useInternetConnectivity`),
    - Location (`useLocation`),
    - Infinite nearby businesses (`useInfiniteNearbyBusinessesQuery`), and
    - Client-side filters (category + search),
      into a single stateful façade consumed by `HomeScreen`.
  - `useAppStore` acts as a thin orchestration layer for cross-screen client state such as:
    - Locally cached businesses, reviews, and favorites,
    - Search and refresh helpers,
      while delegating all remote data access to `businessService`, `reviewService`, and `favoriteService` via `useProtectedAction`.
  - `useUserFavorites` is a tiny hook that exposes the current user’s favorite IDs from `useAppStore`, giving consumers a clear entry point for favorites state.
- **Network/side-effect guard:**
  - `useProtectedAction` centralizes connectivity checks and retry/alert behavior around async actions, so services and hooks can assume they are called only when the device is online.
- **Error handling pattern:**
  - Services log and throw domain-friendly errors; hooks such as `useHomeBusinesses` convert those into UI state (booleans and `errorMessage` strings); and screens (`HomeScreen`, `BusinessDetailsScreen`, `SignUpScreen`) surface them via inline banners or `Alert.alert` so users always get clear feedback when something fails.

This separation makes it clear what is **server state** (owned by React Query + services) vs what is **client/derived state** (owned by hooks/contexts like `useHomeBusinesses`, `useAppStore`, and `AuthContext`).

---

## 4. API Integration Overview

### 3.1 Firebase

The app uses React Native Firebase modules:

- `@react-native-firebase/app` – base config (initialized via Expo runtime).
- `@react-native-firebase/auth` – email/password auth.
- `@react-native-firebase/firestore` – user profiles, reviews, helpful votes, and canonical business docs.
- `@react-native-firebase/storage` – profile/review images.
- `@react-native-firebase/messaging` – FCM tokens for notifications.
- `@notifee/react-native` – local and push notification handling.

Key integration points:

- `hooks/useAuth.ts`
  - Uses `getAuth`, `onAuthStateChanged`, `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut`, `updateProfile`.
  - Uses Firestore (`getFirestore`, `doc`, `getDoc`, `setDoc`, `updateDoc`, `serverTimestamp`) for user profiles and roles.
- `services/reviewService.ts`
  - Uses Firestore collections (`reviews`, `helpfuls`) for review data and helpful votes.
- `services/imageService.ts`
  - Uses Storage (`getStorage`, `ref`, `uploadString`, `getDownloadURL`, `deleteObject`) for images.
- `services/notificationService.ts`
  - Uses Messaging (`messaging().requestPermission()`, `messaging().getToken()`) and Notifee for displaying notifications and handling events.

### 3.2 Geoapify

- Configuration:
  - `GEOAPIFY_API_KEY` from `.env` → `Constants.expoConfig?.extra.GEOAPIFY_API_KEY`.
- `services/geoapifyService.ts`:
  - Constructs URLs like:

    ```text
    https://api.geoapify.com/v2/places?categories=...&filter=circle:lon,lat,radius&limit=...&offset=...&apiKey=GEOAPIFY_API_KEY
    ```

  - Transforms `features` into internal `GeoapifyPlace` objects, making sure lat/lon, categories, and address fields are consistent.

- `services/businessService.ts`:
  - Maps app categories (restaurants/cafes/fast_food) to Geoapify category strings.
  - Delegates raw fetching to `geoapifyService` and focuses on mapping and caching.

---

## 5. Network Performance, Caching & Offline-first

The app is designed to avoid unnecessary network calls, work sensibly while offline, and recover cleanly when the network comes back:

- **React Query + persistence (read-side caching):**
  - `AppNavigator` configures a `QueryClient` with explicit exponential backoff (capped) and avoids retrying obvious client errors (4xx).
  - Queries use a 5-minute `staleTime` and 10-minute `gcTime`, while `PersistQueryClientProvider` persists data to AsyncStorage for up to 6 hours, reducing refetches across app launches.
- **Geoapify service caching & deduplication:**
  - `geoapifyService` maintains a 15-minute in-memory cache and a `pendingRequests` map so identical in-flight queries share a single HTTP request.
  - On errors, it falls back to stale cached data where available so users still see place results instead of a hard failure.
- **Business service TTL cache:**
  - `businessService` wraps Geoapify with an AsyncStorage cache of mapped `Business` models (6-hour TTL) for nearby searches.
  - This sits on top of the in-memory Geoapify cache to keep “nearby” lists fast both within a session and across app restarts.
- **Offline-friendly favorites (mutation queue):**
  - `useAppStore.toggleFavorite` performs optimistic UI updates immediately.
  - When a toggle is blocked by `useProtectedAction` (offline), it is enqueued to `favoritesOfflineQueue_v1` in AsyncStorage.
  - `AppNavigator` + `useInternetConnectivity` flush this queue once the user is logged in and the device is back online by replaying each toggle through `favoriteService.toggleFavorite`.
- **Offline mutation queue for reviews & helpful votes:**
  - `offlineQueueService` is a small AsyncStorage-backed queue that stores pending mutations when the device is offline.
  - **Reviews:**
    - `useAppStore.addReview` and `useAppStore.deleteReview` use `useProtectedAction` to guard network calls.
    - When offline, they enqueue `review:add` / `review:delete` mutations and apply optimistic local state updates so the user still sees their new or removed review while offline.
    - Offline-created reviews are rendered with a `Pending sync` badge in `ReviewCard` so it is visually clear they have not yet reached the backend.
  - **Helpful votes:**
    - `ReviewCard` performs optimistic increment/decrement of `helpful` counts.
    - If the underlying `reviewService.addHelpfulVote` / `removeHelpfulVote` / `updateReviewHelpfulCount` calls fail (e.g., due to connectivity), a `review:helpful` mutation is enqueued instead of hard failing.
  - On reconnect, `AppNavigator` reads the mutation queue via `offlineQueueService` and replays each mutation through `reviewService`, keeping any failures in the queue for a later retry.
  - `BusinessDetailsScreen` and `AddReviewScreen` display inline offline banners (e.g. "You are offline – your review will be saved locally and synced automatically when your connection is restored") so users understand the offline queue behavior without being spammed by generic network alerts.
  - When connectivity is restored while `BusinessDetailsScreen` is visible, it automatically refreshes business details and reviews using the existing React Query refetches, so the screen picks up fresh data without requiring a manual pull-to-refresh.

Together, these layers go beyond default React Query caching to provide explicit retry/backoff, request deduplication, multi-tier caching, and a concrete offline-first story: cached reads, optimistic writes while offline, and queued mutations that automatically sync when connectivity is restored, with clear but unobtrusive offline UX affordances.

## 6. Security

While the app is primarily a client for Firebase/Geoapify, it still applies several security-focused practices:

- **Input validation:**
  - Auth and review forms use Zod schemas to validate email format, password strength, and review length before calling Firebase or Firestore.
  - This reduces the risk of malformed input and ensures users get clear feedback on what needs to be fixed.
- **Backend security rules (Firebase):**
  - Firestore rules (not shown here) enforce that only authenticated users can create reviews and favorites, and that users can only modify their own data.
  - Sensitive operations (e.g., admin dashboards) are guarded by role checks and Firestore constraints.
- **Secrets handling:**
  - Sensitive values such as `GEOAPIFY_API_KEY` and Firebase config are sourced from `.env`/Expo config and are not committed to version control.
- **Dependency vulnerability scanning:**
  - `npm run security:audit` runs `npm audit --audit-level=moderate` to surface known vulnerabilities in third-party packages.
  - This can be run periodically or as part of CI to keep dependencies in a healthier state.
- **Client-side rate limiting:**
  - A small in-memory `RateLimiter` caps login attempts (e.g. 5/minute per email), signup attempts (e.g. 3 per 5 minutes), and review submissions by user/place, returning a friendly "too many attempts, wait N seconds" message.

## 7. Monitoring & Observability

- **Crash reporting (stubbed):**
  - A `CrashReporter` service (currently a Sentry-ready stub) is initialized at app startup and used by a top-level `AppErrorBoundary` to capture render-time errors.
- **Error boundaries:**
  - `AppErrorBoundary` wraps the navigation tree and shows a friendly `ErrorScreen` when unrecoverable errors occur, while sending details to the crash reporter in one place.
- **Structured logging:**
  - A `logger` utility provides `debug`, `info`, `warn`, and `error` methods with an optional `context` tag so logs are easier to search and group (e.g. `Auth.login`, `Reviews.addReview`).
  - Key flows like auth and reviews use `logger.error` instead of raw `console.error`.
- **Analytics events (stubbed):**
  - An `analyticsService` currently logs a few important events in dev (`user_login_success`, `user_signup_success`, `review_submitted`, `favorite_toggled`).
  - This can be wired to a real analytics backend later without changing call sites.

## 8. Testing Strategy

The test suite uses **Jest** and **@testing-library/react-native** for unit and integration tests, plus **Maestro** for a small end-to-end smoke test.

### 4.1 Unit & Integration Tests (Jest)

Configuration:

- `jest.config.js`:
  - `preset: 'react-native'`
  - `testEnvironment: 'jsdom'`
  - `setupFilesAfterEnv: ['<rootDir>/jest.setup.js']`
  - Path alias resolution for `@/src/*`.
- `jest.setup.js`:
  - Mocks heavy native/external modules so tests don’t require a device:
    - AsyncStorage, Firebase (app/auth/firestore/messaging/storage), Notifee.
    - `react-native-encrypted-storage`, `@react-native-community/netinfo`, `@react-native-community/geolocation`.
    - `react-native-chart-kit` replaced with lightweight `<View>` components.

Highlights:

- **Services**
  - `__tests__/services/businessService.test.ts` – caching behavior and integration with Geoapify + AsyncStorage.
  - `__tests__/services/secureStorage.test.ts` – serialization, deserialization, and clear/remove semantics.
  - `__tests__/services/notificationService.test.ts` – FCM token permission, caching, and secure storage.
  - `__tests__/services/geoapifyService.test.ts` – URL building, response transform, caching, and error fallback.
  - `__tests__/services/reviewService.test.ts` – mapping Firestore snapshots into `Review` objects, deleting review images.
  - `__tests__/services/imageService.test.ts` – upload/delete flows with Storage and auth guards.
  - `__tests__/services/offlineQueueService.test.ts` – behavior of the offline mutation queue (enqueue, clear/replace, and MAX_MUTATIONS trimming) used for offline-first review and helpful vote syncing.

- **Hooks**
  - `__tests__/hooks/useProtectedAction.test.ts` – behavior when online vs offline and guarding actions.

- **Screens (integration)**
  - `__tests__/screens/HomeScreen.test.tsx` – renders HomeScreen underneath Navigation + Auth + React Query providers; mocks data hooks and BusinessCard to ensure the "Test Cafe" business appears.
  - `__tests__/screens/BusinessDetailsScreen.test.tsx` – checks that a business and at least one review render with mocked queries.
  - `__tests__/screens/FavoritesScreen.test.tsx` – verifies favorites list and unfavorite interaction.

For more detail, see `TESTING.md`.

### 4.2 End-to-end (E2E) Tests (Maestro)

Maestro flows live under `maestro/`:

- `maestro/home_smoke.yaml` –
  - Launches the app.
  - Asserts the Home subtitle and search placeholder are visible.
  - Optionally taps on the search bar.
  - Does **not** clear app state (assumes user already signed in on device).

- `maestro/login_and_home.yaml` –
  - Clears app state.
  - Launches the app and drives the login screen:
    - Taps the email/password fields.
    - Inputs `MAESTRO_EMAIL` / `MAESTRO_PASSWORD` from env vars.
    - Taps the sign-in button.
  - Asserts the Home screen subtitle and search placeholder are visible.

To run these flows, install Maestro CLI and follow the instructions in `TESTING.md`.

---

## 9. Summary

This project’s architecture separates concerns into:

- **Screens** for UI and navigation.
- **Components** for reusable presentation.
- **Hooks** for app-specific state and orchestration.
- **Services** for business logic and external integrations.
- **Context** for shared app state (auth, role, profile).
- **Utils** for pure helpers (like mapping external API data to domain models).

Testing covers core services, hooks, and screens via Jest, with a minimal Maestro-based e2e flow to validate the real app on a device.

This structure and documentation are designed to make the app easier to understand, extend, and evaluate from an architectural and production-readiness perspective.

---

## 10. Code Quality & Tooling

- **Linting:** `npm run lint` (Expo lint) and `npm run lint:eslint` (raw ESLint) enforce code style and catch common issues across JS/TS/React Native files.
- **Formatting:** `npm run format` and `npm run format:check` use Prettier to keep formatting consistent across the codebase.
- **Pre-commit hook:** Husky runs `npm run lint` and `npm run format:check` on `git commit` to prevent obviously broken or misformatted code from landing in the repo.
- **TypeScript:** `tsconfig.json` extends Expo’s base config with `strict: true` and an `@/src/*` alias. `any` is avoided where possible and constrained to boundaries (e.g. raw Firestore responses) that are immediately mapped into typed domain models like `Business` and `Review`.

This project’s architecture separates concerns into:

- **Screens** for UI and navigation.
- **Components** for reusable presentation.
- **Hooks** for app-specific state and orchestration.
- **Services** for business logic and external integrations.
- **Context** for shared app state (auth, role, profile).
- **Utils** for pure helpers (like mapping external API data to domain models).

Testing covers core services, hooks, and screens via Jest, with a minimal Maestro-based e2e flow to validate the real app on a device.

This structure and documentation are designed to make the app easier to understand, extend, and evaluate from an architectural and production-readiness perspective.
