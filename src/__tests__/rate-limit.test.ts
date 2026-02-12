import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limit';

describe('Rate limiting', () => {
  it('checkRateLimit returns null when limiter is null (not configured)', async () => {
    const result = await checkRateLimit(null, '127.0.0.1');
    expect(result).toBeNull();
  });

  it('checkRateLimit returns null for any identifier when limiter is null', async () => {
    const result1 = await checkRateLimit(null, 'user-123');
    const result2 = await checkRateLimit(null, '');
    expect(result1).toBeNull();
    expect(result2).toBeNull();
  });
});
