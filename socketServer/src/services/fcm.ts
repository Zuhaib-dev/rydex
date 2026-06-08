import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getServiceAccountPath() {
  const candidates = [
    process.env.FIREBASE_ADMIN_JSON_PATH,
    "/etc/secrets/firebase-admin.json",
    path.resolve(process.cwd(), "firebase-admin.json"),
    path.resolve(__dirname, "../../firebase-admin.json"),
  ].filter(Boolean) as string[];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

// Initialize Firebase Admin SDK
try {
  const serviceAccountPath = getServiceAccountPath();
  if (serviceAccountPath) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    console.log(`[FCM] Firebase Admin initialized successfully from ${serviceAccountPath}.`);
  } else {
    console.warn("[FCM] Warning: firebase-admin.json not found in known locations. Push notifications will be disabled.");
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
  if (!admin.apps.length) {
    console.warn("[FCM] Push skipped because Firebase Admin is not initialized.");
    return result;
  }
  if (!tokens || tokens.length === 0) {
    console.warn("[FCM] Push skipped because target user has no FCM tokens.");
    return result;
  }

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
    console.log(`[FCM] Push result: sent=${result.sentCount}, failed=${result.failedCount}.`);

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
