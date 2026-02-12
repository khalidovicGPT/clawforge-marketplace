import { describe, it, expect } from 'vitest';
import { SKILL_CATEGORIES, type SkillCategory } from '@/types/database';

const VALID_CATEGORIES: SkillCategory[] = [
  'productivity', 'communication', 'development', 'data',
  'integration', 'finance', 'marketing', 'security', 'ai', 'other',
];

describe('Category validation', () => {
  it('SKILL_CATEGORIES contains all expected categories', () => {
    const keys = Object.keys(SKILL_CATEGORIES);
    expect(keys).toEqual(expect.arrayContaining(VALID_CATEGORIES));
    expect(keys.length).toBe(VALID_CATEGORIES.length);
  });

  it('each category has a label and emoji', () => {
    for (const key of VALID_CATEGORIES) {
      const cat = SKILL_CATEGORIES[key];
      expect(cat).toBeDefined();
      expect(cat.label).toBeTruthy();
      expect(cat.emoji).toBeTruthy();
    }
  });

  it('rejects invalid category values', () => {
    const invalid = 'hacking';
    expect(VALID_CATEGORIES.includes(invalid as SkillCategory)).toBe(false);
  });

  it('accepts all valid categories', () => {
    for (const cat of VALID_CATEGORIES) {
      expect(VALID_CATEGORIES.includes(cat)).toBe(true);
    }
  });
});
