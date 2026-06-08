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
  const result = { sentCount: 0, failedCount: 0, invalidTokens: [] as string[] };
  if (!admin.apps.length || !tokens || tokens.length === 0) return result;

  try {
    const uniqueTokens = [...new Set(tokens.filter(Boolean))];
    const message: admin.messaging.MulticastMessage = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens: uniqueTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    result.sentCount = response.successCount;
    result.failedCount = response.failureCount;

    if (response.failureCount > 0) {
      console.warn(`[FCM] Failed to send ${response.failureCount} notifications.`);
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const token = uniqueTokens[idx];
          const code = resp.error?.code;
          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token"
          ) {
            result.invalidTokens.push(token);
            console.warn(`[FCM] Removing invalid token ${token.slice(0, 12)}... (${code})`);
            return;
          }
          console.error(`[FCM] Error for token ${token}:`, resp.error);
        }
      });
    }
  } catch (error) {
    console.error("[FCM] Error sending push notification:", error);
  }

  return result;
}
