import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
// REMOVE THIS LINE - app is already initialized in index.ts
// initializeApp();

interface HelpfulData {
  reviewId: string;
  reviewOwnerId: string;
  taggedBy: string;
  businessId?: string;
}

export const sendHelpfulNotification = onDocumentCreated(
  "helpfuls/{helpfulId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event");
      return;
    }

    const helpfulData = snapshot.data() as HelpfulData;
    const { reviewId, reviewOwnerId, taggedBy, businessId } = helpfulData;

    // Don't send notification if user voted on their own review
    if (reviewOwnerId === taggedBy) {
      console.log("User voted on their own review, skipping notification");
      return;
    }

    try {
      // Get Firestore instance
      const db = getFirestore();
      
      // Get the review owner's FCM tokens
      const userDoc = await db.collection("users").doc(reviewOwnerId).get();

      if (!userDoc.exists) {
        console.log("User document not found:", reviewOwnerId);
        return;
      }

      const userData = userDoc.data();
      const fcmTokens: string[] = userData?.fcmTokens || [];

      if (fcmTokens.length === 0) {
        console.log("No FCM tokens found for user:", reviewOwnerId);
        return;
      }

      // Get the user who voted
      const voterDoc = await db.collection("users").doc(taggedBy).get();
      const voterName = voterDoc.data()?.name || "Someone";

      // Get review details for the notification
      const reviewDoc = await db.collection("reviews").doc(reviewId).get();
      const reviewText = reviewDoc.data()?.text || "";

      // Get Messaging instance
      const messaging = getMessaging();
      
      // Prepare notification payload
      const message = {
        notification: {
          title: "Your review was helpful!",
          body: `${voterName} found your review helpful: "${reviewText.substring(0, 60)}${
            reviewText.length > 60 ? "..." : ""
          }"`,
        },
        data: {
          reviewId,
          businessId: businessId || "",
          type: "helpful_review",
        },
        android: {
          priority: "high" as const,
        },
        tokens: fcmTokens,
      };

      // Send notification
      const response = await messaging.sendEachForMulticast(message);

      console.log("Notification sent successfully");
      console.log("Success count:", response.successCount);
      console.log("Failure count:", response.failureCount);

      // Clean up failed tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(fcmTokens[idx]);
            console.log("Failed token:", fcmTokens[idx], "Error:", resp.error);
          }
        });

        // Remove failed tokens from user document
        if (failedTokens.length > 0) {
          await db
            .collection("users")
            .doc(reviewOwnerId)
            .update({
              fcmTokens: FieldValue.arrayRemove(...failedTokens),
            });
          console.log("Removed invalid FCM tokens:", failedTokens.length);
        }
      }

      return;
    } catch (error) {
      console.error("Error sending notification:", error);
      return;
    }
  }
);