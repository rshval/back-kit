import { describe, expect, test, vi } from 'vitest';

import {
  clearDeprecatedAliasWarningsForTests,
  resolveDeprecatedAliasField,
} from './deprecated-alias.js';

describe('resolveDeprecatedAliasField', () => {
  test('returns canonical field value when canonical key is provided', () => {
    const result = resolveDeprecatedAliasField({
      source: { paymentStatus: 'paid' },
      canonicalKey: 'paymentStatus',
      deprecatedAliases: ['payment_status'],
      removalDate: '2026-12-31',
      warningMessage: 'deprecated',
      env: 'development',
    });

    expect(result).toEqual({
      value: 'paid',
      sourceKey: 'paymentStatus',
      aliasUsed: null,
      isFromAlias: false,
      removalDate: '2026-12-31',
    });
  });

  test('returns alias value and metadata when deprecated alias is used', () => {
    const warn = vi.fn();

    const result = resolveDeprecatedAliasField({
      source: { payment_status: 'paid' },
      canonicalKey: 'paymentStatus',
      deprecatedAliases: ['payment_status'],
      removalDate: '2026-12-31',
      warningMessage: 'deprecated',
      warn,
      env: 'development',
    });

    expect(result).toEqual({
      value: 'paid',
      sourceKey: 'payment_status',
      aliasUsed: 'payment_status',
      isFromAlias: true,
      removalDate: '2026-12-31',
    });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  test('prioritizes canonical value when canonical and alias are both present', () => {
    const warn = vi.fn();

    const result = resolveDeprecatedAliasField({
      source: { paymentStatus: 'paid', payment_status: 'cancelled' },
      canonicalKey: 'paymentStatus',
      deprecatedAliases: ['payment_status'],
      removalDate: '2026-12-31',
      warningMessage: 'deprecated',
      warn,
      env: 'development',
    });

    expect(result.value).toBe('paid');
    expect(result.isFromAlias).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  test('warns once in development mode for repeated alias usage', () => {
    clearDeprecatedAliasWarningsForTests();
    const warn = vi.fn();

    resolveDeprecatedAliasField({
      source: { payment_status: 'paid' },
      canonicalKey: 'paymentStatus',
      deprecatedAliases: ['payment_status'],
      removalDate: '2026-12-31',
      warningMessage: 'deprecated',
      warn,
      env: 'development',
    });

    resolveDeprecatedAliasField({
      source: { payment_status: 'paid' },
      canonicalKey: 'paymentStatus',
      deprecatedAliases: ['payment_status'],
      removalDate: '2026-12-31',
      warningMessage: 'deprecated',
      warn,
      env: 'development',
    });

    expect(warn).toHaveBeenCalledTimes(1);
  });

  test('does not warn in production mode', () => {
    clearDeprecatedAliasWarningsForTests();
    const warn = vi.fn();

    resolveDeprecatedAliasField({
      source: { payment_status: 'paid' },
      canonicalKey: 'paymentStatus',
      deprecatedAliases: ['payment_status'],
      removalDate: '2026-12-31',
      warningMessage: 'deprecated',
      warn,
      env: 'production',
    });

    expect(warn).not.toHaveBeenCalled();
  });
});
