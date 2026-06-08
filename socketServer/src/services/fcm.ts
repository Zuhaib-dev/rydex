import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
try {
  const serviceAccountPath = path.resolve(__dirname, "../../firebase-admin.json");
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("[FCM] Firebase Admin initialized successfully.");
  } else {
    console.warn("[FCM] Warning: firebase-admin.json not found. Push notifications will be disabled.");
  }
} catch (error) {
  console.error("[FCM] Failed to initialize Firebase Admin:", error);
}

/**
 * Send a push notification to specific FCM tokens
 */
export async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) {
  if (!admin.apps.length || !tokens || tokens.length === 0) return;

  try {
    const message: admin.messaging.MulticastMessage = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    if (response.failureCount > 0) {
      console.warn(`[FCM] Failed to send ${response.failureCount} notifications.`);
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`[FCM] Error for token ${tokens[idx]}:`, resp.error);
        }
      });
    }
  } catch (error) {
    console.error("[FCM] Error sending push notification:", error);
  }
}
