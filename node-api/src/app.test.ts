import { describe, expect, it } from 'vitest';
import { commissionFor } from './app.js';

describe('commissionFor', () => {
  it('aplica corretamente as três faixas', () => {
    expect(commissionFor(99.99)).toBe(0);
    expect(commissionFor(100)).toBe(1);
    expect(commissionFor(400.50)).toBe(4.01);
    expect(commissionFor(500)).toBe(25);
  });
});
