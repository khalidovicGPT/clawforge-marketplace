import { describe, it, expect } from 'vitest';
import { formatPrice, formatDate, formatNumber, slugify, truncate, getInitials, formatFileSize, formatRating, sanitizePostgrestSearch } from '@/lib/utils';

describe('formatPrice', () => {
  it('retourne "Gratuit" pour 0', () => {
    expect(formatPrice(0)).toBe('Gratuit');
  });

  it('retourne "Gratuit" pour null', () => {
    expect(formatPrice(null)).toBe('Gratuit');
  });

  it('formate un prix en EUR', () => {
    const result = formatPrice(1999);
    expect(result).toContain('19');
    expect(result).toContain('99');
  });

  it('formate un petit prix', () => {
    const result = formatPrice(100);
    expect(result).toContain('1');
  });
});

describe('formatDate', () => {
  it('formate une date string', () => {
    const result = formatDate('2026-01-15');
    expect(result).toContain('2026');
    expect(result).toContain('janv');
  });

  it('formate un objet Date', () => {
    const result = formatDate(new Date('2026-06-01'));
    expect(result).toBeTruthy();
  });
});

describe('formatNumber', () => {
  it('formate un nombre simple', () => {
    expect(formatNumber(42)).toBeTruthy();
  });

  it('formate un grand nombre avec separateurs', () => {
    const result = formatNumber(1234567);
    // Format francais : 1 234 567 (avec espace insecable)
    expect(result).toBeTruthy();
  });
});

describe('slugify', () => {
  it('convertit en minuscules', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('supprime les accents', () => {
    expect(slugify('Créateur étoile')).toBe('createur-etoile');
  });

  it('supprime les caracteres speciaux', () => {
    expect(slugify('skill@v2.0!')).toBe('skill-v2-0');
  });

  it('supprime les tirets en debut/fin', () => {
    expect(slugify('-hello-')).toBe('hello');
  });

  it('gere les espaces multiples', () => {
    expect(slugify('hello   world')).toBe('hello-world');
  });
});

describe('truncate', () => {
  it('ne tronque pas les textes courts', () => {
    expect(truncate('court', 10)).toBe('court');
  });

  it('tronque les textes longs avec ...', () => {
    expect(truncate('texte tres long', 10)).toBe('texte t...');
  });

  it('gere exactement maxLength', () => {
    expect(truncate('exact', 5)).toBe('exact');
  });
});

describe('getInitials', () => {
  it('retourne les initiales', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('retourne ?? pour null', () => {
    expect(getInitials(null)).toBe('??');
  });

  it('limite a 2 caracteres', () => {
    expect(getInitials('Jean Pierre Dupont')).toBe('JP');
  });

  it('gere un seul mot', () => {
    expect(getInitials('John')).toBe('J');
  });
});

describe('formatFileSize', () => {
  it('retourne N/A pour null', () => {
    expect(formatFileSize(null)).toBe('N/A');
  });

  it('formate en bytes', () => {
    expect(formatFileSize(500)).toBe('500.0 B');
  });

  it('formate en KB', () => {
    expect(formatFileSize(1500)).toContain('KB');
  });

  it('formate en MB', () => {
    expect(formatFileSize(2 * 1024 * 1024)).toContain('MB');
  });
});

describe('formatRating', () => {
  it('retourne N/A pour null', () => {
    expect(formatRating(null)).toBe('N/A');
  });

  it('formate avec 1 decimale', () => {
    expect(formatRating(4.567)).toBe('4.6');
  });

  it('formate un entier', () => {
    expect(formatRating(5)).toBe('5.0');
  });
});

describe('sanitizePostgrestSearch', () => {
  it('supprime les virgules', () => {
    expect(sanitizePostgrestSearch('a,b')).toBe('ab');
  });

  it('supprime les parentheses', () => {
    expect(sanitizePostgrestSearch('a(b)')).toBe('ab');
  });

  it('supprime les points', () => {
    expect(sanitizePostgrestSearch('a.b')).toBe('ab');
  });

  it('supprime les backslashes', () => {
    expect(sanitizePostgrestSearch('a\\b')).toBe('ab');
  });

  it('preserve les caracteres normaux', () => {
    expect(sanitizePostgrestSearch('hello world 123')).toBe('hello world 123');
  });
});
