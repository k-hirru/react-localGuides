import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from 'firebase-admin';

admin.initializeApp();

// Set global options
setGlobalOptions({ 
  region: "asia-southeast1",
  maxInstances: 10 
});

// Export functions
export { sendHelpfulNotification } from './notifications/helpfulNotification';