import crypto from 'crypto';

const SECRET = process.env.ADMIN_SECRET_KEY || 'clawforge-verification-secret';

/**
 * Generate a signed verification token containing the user ID.
 * Token format: base64url(userId.expiry).hmacSignature
 * Expires in 24 hours.
 */
export function generateVerificationToken(userId: string): string {
  const exp = Date.now() + 24 * 60 * 60 * 1000; // 24h
  const data = `${userId}.${exp}`;
  const dataB64 = Buffer.from(data).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
  return `${dataB64}.${sig}`;
}

/**
 * Verify a token and return the user ID, or null if invalid/expired.
 */
export function verifyVerificationToken(token: string): string | null {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return null;

  const dataB64 = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);

  if (!dataB64 || !sig) return null;

  let data: string;
  try {
    data = Buffer.from(dataB64, 'base64url').toString();
  } catch {
    return null;
  }

  // Verify signature
  const expectedSig = crypto.createHmac('sha256', SECRET).update(data).digest('hex');

  if (sig.length !== expectedSig.length) return null;

  const sigMatch = crypto.timingSafeEqual(
    Buffer.from(sig, 'hex'),
    Buffer.from(expectedSig, 'hex'),
  );
  if (!sigMatch) return null;

  // Check expiry
  const lastDot = data.lastIndexOf('.');
  const userId = data.slice(0, lastDot);
  const exp = parseInt(data.slice(lastDot + 1), 10);

  if (isNaN(exp) || Date.now() > exp) return null;

  return userId;
}
