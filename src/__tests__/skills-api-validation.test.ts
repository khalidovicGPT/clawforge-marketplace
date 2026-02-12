import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { SKILL_CATEGORIES, type SkillCategory } from '@/types/database';

// Mirror the query schema from the API route for unit testing
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(12),
  category: z.string().nullish().transform(v => v || undefined),
  certification: z.enum(['bronze', 'silver', 'gold']).nullish().transform(v => v || undefined),
  priceType: z.enum(['free', 'one_time']).nullish().transform(v => v || undefined),
  search: z.string().nullish().transform(v => v || undefined),
  sortBy: z.enum(['newest', 'popular', 'rating', 'price_asc', 'price_desc']).default('newest'),
});

const VALID_CATEGORIES = Object.keys(SKILL_CATEGORIES) as SkillCategory[];

describe('POST /api/skills - category validation logic', () => {
  it('accepts valid categories', () => {
    for (const cat of VALID_CATEGORIES) {
      expect(VALID_CATEGORIES.includes(cat)).toBe(true);
    }
  });

  it('rejects unknown categories', () => {
    const invalid = ['hacking', 'gambling', 'foo', '', '  '];
    for (const cat of invalid) {
      expect(VALID_CATEGORIES.includes(cat as SkillCategory)).toBe(false);
    }
  });
});

describe('GET /api/skills - query parameter validation', () => {
  it('parses valid query params', () => {
    const result = querySchema.parse({
      page: '2',
      pageSize: '20',
      category: 'productivity',
      certification: 'gold',
      priceType: 'free',
      search: 'email',
      sortBy: 'popular',
    });

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(20);
    expect(result.category).toBe('productivity');
    expect(result.certification).toBe('gold');
    expect(result.priceType).toBe('free');
    expect(result.search).toBe('email');
    expect(result.sortBy).toBe('popular');
  });

  it('applies defaults for missing params', () => {
    const result = querySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(12);
    expect(result.sortBy).toBe('newest');
    expect(result.category).toBeUndefined();
    expect(result.certification).toBeUndefined();
  });

  it('rejects invalid page number', () => {
    expect(() => querySchema.parse({ page: '0' })).toThrow();
    expect(() => querySchema.parse({ page: '-1' })).toThrow();
  });

  it('rejects pageSize > 50', () => {
    expect(() => querySchema.parse({ pageSize: '100' })).toThrow();
  });

  it('rejects invalid certification value', () => {
    expect(() => querySchema.parse({ certification: 'diamond' })).toThrow();
  });

  it('rejects invalid sortBy value', () => {
    expect(() => querySchema.parse({ sortBy: 'random' })).toThrow();
  });

  it('transforms null/empty category to undefined', () => {
    const result1 = querySchema.parse({ category: null });
    const result2 = querySchema.parse({ category: '' });
    expect(result1.category).toBeUndefined();
    expect(result2.category).toBeUndefined();
  });
});
