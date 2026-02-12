import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

// Only initialize if env vars are available
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Auth routes: 5 requests per 60 seconds
export const authLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '60 s'),
      prefix: 'ratelimit:auth',
    })
  : null;

// Skill creation: 3 requests per 60 seconds
export const skillCreateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '60 s'),
      prefix: 'ratelimit:skill-create',
    })
  : null;

// Checkout: 10 requests per 60 seconds
export const checkoutLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      prefix: 'ratelimit:checkout',
    })
  : null;

/**
 * Check rate limit for a given identifier.
 * Returns a NextResponse with 429 status if rate limited, or null if allowed.
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<NextResponse | null> {
  if (!limiter) return null; // Rate limiting not configured, allow request

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      },
    );
  }

  return null;
}
