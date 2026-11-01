import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const TOKEN_EXPIRY_MS = 15000;

function getSecretKey() {
  const configuredKey = process.env.PASS_SECRET_KEY;
  if (configuredKey) {
    return /^[\da-fA-F]{64}$/.test(configuredKey) ? Buffer.from(configuredKey, 'hex') : null;
  }

  // Reuse the already-required private service secret with domain separation
  // when deployments have not configured a dedicated pass key.
  const internalSecret = process.env.SOCKET_INTERNAL_SECRET;
  if (!internalSecret || internalSecret.length < 32) return null;
  return crypto.createHmac('sha256', internalSecret).update('rydex:smart-pass-token:v1').digest();
}

export interface TokenPayload {
  u: string; // userId
  p: string; // passId
  t: number; // timestamp
  j: string; // single-use token id
}

export class PassTokenService {
  /**
   * Generates a time-sensitive encrypted token for the pass.
   * @param userId The ID of the user.
   * @param passId The ID of the pass.
   * @returns A base64url encoded encrypted token.
   */
  static generateToken(userId: string, passId: string): string {
    const secretKey = getSecretKey();
    if (!secretKey) throw new Error('Configure a 64-character hexadecimal PASS_SECRET_KEY or a strong SOCKET_INTERNAL_SECRET.');

    const payload: TokenPayload = {
      u: userId,
      p: passId,
      t: Date.now(),
      j: crypto.randomBytes(16).toString('base64url'),
    };

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, secretKey, iv);

    const payloadString = JSON.stringify(payload);
    let encrypted = cipher.update(payloadString, 'utf8', 'base64url');
    encrypted += cipher.final('base64url');
    
    const authTag = cipher.getAuthTag().toString('base64url');

    // Combine IV, authTag, and encrypted data.
    // Format: iv.authTag.encrypted
    const token = `${iv.toString('base64url')}.${authTag}.${encrypted}`;
        
    return token;
  }

  /**
   * Decrypts and verifies the token.
   * @param token The base64url encoded token.
   * @returns The decrypted TokenPayload or null if invalid/expired.
   */
  static verifyToken(token: string): TokenPayload | null {
    try {
      const secretKey = getSecretKey();
      if (!secretKey) return null;
      // Aggressively extract only the token parts.
      const match = token.match(/([A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+)/);
      if (!match) return null;
      
      const cleanToken = match[1];
      const parts = cleanToken.split('.');
      if (parts.length !== 3) return null;

      const iv = Buffer.from(parts[0], 'base64url');
      const authTag = Buffer.from(parts[1], 'base64url');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(ALGORITHM, secretKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'base64url', 'utf8');
      decrypted += decipher.final('utf8');

      const payload: TokenPayload = JSON.parse(decrypted);

      // Verify expiration
      if (
        typeof payload.j !== 'string' || !payload.j ||
        !Number.isFinite(payload.t) || Date.now() - payload.t >= TOKEN_EXPIRY_MS ||
        payload.t > Date.now() + 5_000
      ) {
        console.warn('Token expired');
        return null;
      }

      return payload;
    } catch (error) {
      console.error('Token verification failed', error);
      return null;
    }
  }
}
