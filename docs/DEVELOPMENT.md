# Development Guide

This guide covers how to set up, run, test, and extend the Local Guides app in a way that matches the rest of the codebase.

## Prerequisites

- Node.js 18+ and npm (LTS recommended)
- Expo tooling (via `npx expo` or global `expo` CLI)
- iOS Simulator (Xcode) and/or Android emulator or physical device

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in the values you have (Firebase, Geoapify, etc.).
3. Start the dev server:
   ```bash
   npm run expo:start
   ```

## Running the app

- iOS simulator:
  ```bash
  npm run expo:ios
  ```
- Android emulator/device:
  ```bash
  npm run expo:android
  ```

## Testing

See `TESTING.md` for full details, but the common commands are:

- Run all tests:
  ```bash
  npm test
  ```
- Run a single test file:
  ```bash
  TMPDIR="$PWD/.tmp" npx jest --runInBand __tests__/utils/logger.test.ts
  ```
- Jest watch mode:
  ```bash
  npm run test:watch
  ```

The test tree mirrors `src/`:

- `__tests__/services` – service and offline-queue tests
- `__tests__/hooks` – custom hooks
- `__tests__/components` – small UI pieces
- `__tests__/screens` – light integration tests around navigation/screens

Recent smaller, fast suites include:

- `__tests__/utils/rateLimiter.test.ts`
- `__tests__/utils/logger.test.ts`
- `__tests__/components/OfflineBanner.test.tsx`
- `__tests__/components/simpleComponents.test.tsx`

When adding new tests, favor:

- Pure functions and small components over heavy navigation stacks
- Fast, deterministic tests without network or timers where possible

## Code quality

- Lint:
  ```bash
  npm run lint
  ```
- Format:
  ```bash
  npm run format
  ```
- Type-check (if needed):
  ```bash
  npx tsc --noEmit
  ```

## Branches and commits

- Create a feature branch from `main` using a short, descriptive name, e.g. `feat/offline-queue`, `docs/add-dev-guide`.
- Use Conventional Commit messages. See `CONTRIBUTING.md` for full rules, but a typical commit looks like:

  ```text
  docs: add development guide and contributing rules

  - Describe the main change
  - Mention any tests or docs you touched
  ```

## Offline-first behaviour (quick reference)

- Favorites, reviews, and helpful votes queue locally when offline.
- `BusinessDetailsScreen` and `AddReviewScreen` show inline offline banners.
- Queued actions sync automatically when connectivity returns.

If you change any of this behaviour, please update both this file and the README offline section.
