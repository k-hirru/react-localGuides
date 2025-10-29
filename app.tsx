import { AppRegistry } from 'react-native';
import AppNavigator from '@/src/navigation/AppNavigator';
import "@/src/utils/supressWarnings";

AppRegistry.registerComponent('main', () => AppNavigator);