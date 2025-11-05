import { setGlobalOptions } from "firebase-functions/v2";
import { initializeApp } from "firebase-admin/app";

// Initialize Firebase Admin with modular syntax
initializeApp();

// Set global options
setGlobalOptions({ 
  region: "asia-southeast1",
  maxInstances: 10 
});

// Export functions
export { sendHelpfulNotification } from './notifications/helpfulNotification';