import { describe, expect, test } from 'vitest';

import { createPinCode, translitUrl } from './helpers.js';

describe('helpers', () => {
  test('createPinCode returns number in range', () => {
    const value = createPinCode(1, 5);

    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(5);
  });

  test('translitUrl transliterates cyrillic', () => {
    expect(translitUrl('Привет Мир')).toBe('privet-mir');
  });
});
