import crypto from 'crypto';

// Use a 32-byte (256-bit) secret key for AES-256-GCM
// In production, this MUST come from an environment variable.
const SECRET_KEY = process.env.PASS_SECRET_KEY 
  ? Buffer.from(process.env.PASS_SECRET_KEY, 'hex') 
  : crypto.createHash('sha256').update('super-secret-dev-key').digest();

const ALGORITHM = 'aes-256-gcm';
const TOKEN_EXPIRY_MS = 15000; // 15 seconds

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
    let encrypted = cipher.update(payloadString, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag().toString('base64');

    // Combine IV, encrypted data, and authTag. Base64url encode them to be URL and NFC/Audio friendly.
    // Format: iv.authTag.encrypted
    const token = `${iv.toString('base64')}.${authTag}.${encrypted}`
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
        
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
      // This is crucial for NFC Web APIs which sometimes include NDEF language headers (like '\x02en') 
      // in the payload when reading text records if not decoded perfectly by the client.
      const match = token.match(/([A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+)/);
      if (!match) return null;
      
      const cleanToken = match[1];

      // Revert base64url encoding
      let base64Token = cleanToken
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      // Add padding if necessary
      while (base64Token.length % 4) {
        base64Token += '=';
      }

      const parts = base64Token.split('.');
      if (parts.length !== 3) return null;

      const iv = Buffer.from(parts[0], 'base64');
      const authTag = Buffer.from(parts[1], 'base64');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      const payload: TokenPayload = JSON.parse(decrypted);

      // Verify expiration (15 seconds)
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
