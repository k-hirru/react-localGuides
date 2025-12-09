/* eslint-env jest */
/* eslint-disable no-undef */
import '@testing-library/jest-native/extend-expect';

// AsyncStorage mock
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Expo / React Native environment mocks
jest.mock('expo-constants', () => ({
  expoConfig: { extra: {} },
  manifest: { extra: {} },
}));

// Firebase mocks (minimal)
jest.mock('@react-native-firebase/app', () => {
  const app = {};
  return {
    __esModule: true,
    default: () => app,
    getApp: () => app,
    getApps: () => [app],
    initializeApp: () => app,
  };
});

jest.mock('@react-native-firebase/firestore', () => {
  const collection = jest.fn();
  const doc = jest.fn();
  const getDoc = jest.fn();
  const getDocs = jest.fn();
  const where = jest.fn();
  const orderBy = jest.fn();
  const limit = jest.fn();
  const query = jest.fn();
  const serverTimestamp = jest.fn(() => ({ '.sv': 'timestamp' }));
  const setDoc = jest.fn();
  const updateDoc = jest.fn();
  const addDoc = jest.fn();
  const deleteDoc = jest.fn();
  const increment = jest.fn((n) => ({ incrementBy: n }));
  const writeBatch = jest.fn(() => ({
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  }));

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
    addDoc,
    deleteDoc,
    increment,
    writeBatch,
    FirebaseFirestoreTypes: {},
  };
});

jest.mock('@react-native-firebase/auth', () => {
  const auth = {};
  return {
    __esModule: true,
    default: () => auth,
    getAuth: () => auth,
    onAuthStateChanged: jest.fn((_auth, callback) => {
      // Immediately call callback with null user
      callback(null);
      return jest.fn(); // unsubscribe function
    }),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    updateProfile: jest.fn(),
    FirebaseAuthTypes: {},
  };
});

jest.mock('@notifee/react-native', () => {
  const mock = {
    onBackgroundEvent: jest.fn(),
    onForegroundEvent: jest.fn(),
    requestPermission: jest.fn().mockResolvedValue(true),
    getInitialNotification: jest.fn().mockResolvedValue(null),
    cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
    displayNotification: jest.fn().mockResolvedValue(undefined),
    setNotificationCategories: jest.fn().mockResolvedValue(undefined),
  };
  return {
    __esModule: true,
    default: mock,
    ...mock,
  };
});

jest.mock('@react-native-firebase/messaging', () => {
  const instance = {
    requestPermission: jest.fn(),
    getToken: jest.fn(),
    onMessage: jest.fn(),
    setBackgroundMessageHandler: jest.fn(),
  };

  const messagingFn = () => instance;

  // Mirror the native enum shape used in code
  messagingFn.AuthorizationStatus = {
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  };

  messagingFn.getIsHeadless = jest.fn().mockResolvedValue(false);

  return {
    __esModule: true,
    default: messagingFn,
    ...messagingFn,
  };
});

jest.mock('react-native-permissions', () => {
  return {
    __esModule: true,
    RESULTS: {},
    PERMISSIONS: {},
    request: jest.fn(),
    check: jest.fn(),
    openSettings: jest.fn(),
  };
});

jest.mock('@react-native-community/geolocation', () => ({
  __esModule: true,
  default: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
    stopObserving: jest.fn(),
    requestAuthorization: jest.fn(),
  },
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(),
    fetch: jest.fn().mockResolvedValue({ isConnected: true }),
  },
}));

jest.mock('@react-native-firebase/storage', () => {
  const getStorage = jest.fn();
  const ref = jest.fn((_storage, path) => ({ fullPath: path }));
  const uploadString = jest.fn();
  const getDownloadURL = jest.fn();
  const deleteObject = jest.fn();
  return {
    __esModule: true,
    default: () => ({ getStorage, ref, uploadString, getDownloadURL, deleteObject }),
    getStorage,
    ref,
    uploadString,
    getDownloadURL,
    deleteObject,
  };
});

// Avoid native errors for chart kit in tests
jest.mock('react-native-chart-kit', () => {
  const React = require('react');
  const View = require('react-native').View;
  const MockChart = (props) => React.createElement(View, props, props.children);
  return {
    BarChart: MockChart,
    PieChart: MockChart,
    LineChart: MockChart,
  };
});

jest.mock('react-native-encrypted-storage', () => {
  const store = new Map();

  return {
    __esModule: true,
    default: {
      setItem: jest.fn((key, value) => {
        store.set(key, value);
        return Promise.resolve();
      }),
      getItem: jest.fn((key) => {
        return Promise.resolve(store.get(key) ?? null);
      }),
      removeItem: jest.fn((key) => {
        store.delete(key);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store.clear();
        return Promise.resolve();
      }),
    },
  };
});

// Some React Native internals expect clearImmediate / setImmediate to exist (e.g., StatusBar)
if (!global.clearImmediate) {
  // eslint-disable-next-line no-undef
  global.clearImmediate = () => {};
}
if (!global.setImmediate) {
  // eslint-disable-next-line no-undef
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}
