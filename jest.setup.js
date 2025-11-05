/* jest.setup.js */
try {
  // older RN internal path — may not exist on RN 0.79+
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
} catch (e) {
  // ignore if path doesn't exist
}