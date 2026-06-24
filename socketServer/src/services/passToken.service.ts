import crypto from 'crypto';

// Use a 32-byte (256-bit) secret key for AES-256-GCM
// In production, this MUST come from an environment variable.
const SECRET_KEY = process.env.PASS_SECRET_KEY 
  ? Buffer.from(process.env.PASS_SECRET_KEY, 'hex') 
  : crypto.createHash('sha256').update('super-secret-dev-key').digest();

const ALGORITHM = 'aes-256-gcm';
const TOKEN_EXPIRY_MS = 30000; // 30 seconds

export interface TokenPayload {
  u: string; // userId
  p: string; // passId
  t: number; // timestamp
}

export class PassTokenService {
  /**
   * Generates a time-sensitive encrypted token for the pass.
   * @param userId The ID of the user.
   * @param passId The ID of the pass.
   * @returns A base64url encoded encrypted token.
   */
  static generateToken(userId: string, passId: string): string {
    const payload: TokenPayload = {
      u: userId,
      p: passId,
      t: Date.now(),
    };

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);

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
      // Aggressively extract only the token parts.
      const match = token.match(/([A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+)/);
      if (!match) return null;
      
      const cleanToken = match[1];
      const parts = cleanToken.split('.');
      if (parts.length !== 3) return null;

      const iv = Buffer.from(parts[0], 'base64url');
      const authTag = Buffer.from(parts[1], 'base64url');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'base64url', 'utf8');
      decrypted += decipher.final('utf8');

      const payload: TokenPayload = JSON.parse(decrypted);

      // Verify expiration
      if (Date.now() - payload.t > TOKEN_EXPIRY_MS) {
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
