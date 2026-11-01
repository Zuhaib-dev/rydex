import { createHmac } from "node:crypto";

const SOCKET_TOKEN_TTL_SECONDS = 60;

export function signSocketToken(userId: string, secret: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    exp: Math.floor(now / 1000) + SOCKET_TOKEN_TTL_SECONDS,
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
