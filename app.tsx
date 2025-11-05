import { AppRegistry, LogBox } from 'react-native';
import AppNavigator from '@/src/navigation/AppNavigator';
declare global {
  var RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS: boolean;
}
// 🔇 Silence React Native Firebase deprecation warnings
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;


LogBox.ignoreAllLogs(true);




AppRegistry.registerComponent('main', () => AppNavigator);