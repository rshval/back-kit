import { describe, expect, test } from 'vitest';

import { createTokenByConfig, getBaseUrlByConfig } from './global.js';

describe('global helpers', () => {
  test('getBaseUrlByConfig returns dev url with port', () => {
    expect(
      getBaseUrlByConfig(
        {
          NODE_ENV: 'development',
          server: { domain: 'test.ru', port: 3000 },
          jwt: {},
        },
        '/api',
      ),
    ).toBe('//test.ru:3000/api');
  });

  test('createTokenByConfig throws without jwt keys', () => {
    expect(() =>
      createTokenByConfig({
        config: {
          NODE_ENV: 'production',
          server: { domain: 'test.ru' },
          jwt: {},
        },
        user: { _id: '1' },
        expiresIn: '1h',
      }),
    ).toThrowError('JWT key not configured');
  });
});
