import { LogBox } from "react-native";

// Suppress Firebase namespaced API warnings temporarily
LogBox.ignoreLogs([
  "This method is deprecated (as well as all React Native Firebase namespaced API)",
]);