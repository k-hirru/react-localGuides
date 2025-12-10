// This file is no longer used by Jest (see jest.setup.js). It is kept only if you want TS-typed
// references; you can safely delete it if you prefer.
import '@testing-library/jest-native/extend-expect';

// AsyncStorage mock
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Expo / React Native environment mocks
jest.mock('expo-constants', () => ({
  expoConfig: { extra: {} },
  manifest: { extra: {} },
}));

// Firebase mocks (minimal)
jest.mock('@react-native-firebase/firestore', () => {
  const collection = jest.fn();
  const doc = jest.fn();
  const getDoc = jest.fn();
  const getDocs = jest.fn();
  const where = jest.fn();
  const orderBy = jest.fn();
  const limit = jest.fn();
  const query = jest.fn();
  const serverTimestamp = jest.fn();
  const setDoc = jest.fn();
  const updateDoc = jest.fn();

  return {
    __esModule: true,
    default: () => ({ collection, doc }),
    getFirestore: () => ({ collection, doc }),
    collection,
    doc,
    getDoc,
    getDocs,
    where,
    orderBy,
    limit,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    FirebaseFirestoreTypes: {},
  };
});

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => ({}),
}));

// Avoid native errors for chart kit in tests
jest.mock('react-native-chart-kit', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const View = require('react-native').View;
  const MockChart = (props: any) => React.createElement(View, props, props.children);
  return {
    BarChart: MockChart,
    PieChart: MockChart,
    LineChart: MockChart,
  };
});
