import { describe, expect, test } from 'vitest';

import {
  isEmpty,
  isValidCode,
  isValidEmail,
  patternPassword,
} from './validation.js';

describe('validation helpers', () => {
  test('isValidEmail validates email format', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('wrong-email')).toBe(false);
  });

  test('isValidCode checks code length', () => {
    expect(isValidCode(1234, 4)).toBe(true);
    expect(isValidCode('12345', 4)).toBe(false);
  });

  test('isEmpty checks strings and objects', () => {
    expect(isEmpty('   ')).toBe(true);
    expect(isEmpty({})).toBe(true);
    expect(isEmpty('abc')).toBe(false);
  });

  test('patternPassword returns regex', () => {
    expect(patternPassword().test('abc12345')).toBe(true);
  });
});
