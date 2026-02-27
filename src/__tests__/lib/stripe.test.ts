import { describe, it, expect } from 'vitest';
import { calculatePlatformFee, PLATFORM_FEE_PERCENT } from '@/lib/stripe';

describe('calculatePlatformFee', () => {
  it('calcule 20% de commission', () => {
    expect(calculatePlatformFee(1000)).toBe(200); // 10€ → 2€ fee
  });

  it('gere un montant a 0', () => {
    expect(calculatePlatformFee(0)).toBe(0);
  });

  it('arrondit correctement', () => {
    // 33 * 0.2 = 6.6 → arrondi a 7
    expect(calculatePlatformFee(33)).toBe(7);
  });

  it('gere de gros montants', () => {
    expect(calculatePlatformFee(99900)).toBe(19980); // 999€ → 199.80€
  });

  it('utilise le bon pourcentage', () => {
    expect(PLATFORM_FEE_PERCENT).toBe(20);
  });

  it('le createur recoit 80%', () => {
    const price = 5000; // 50€
    const fee = calculatePlatformFee(price);
    const creatorAmount = price - fee;
    expect(creatorAmount).toBe(4000); // 40€
  });
});
