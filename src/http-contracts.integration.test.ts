import { describe, expect, test } from 'vitest';

import { isFail, requestApi, type HttpAdapter } from './http-contracts.js';

const createApiAdapter = (status: number, body: unknown): HttpAdapter => ({
  source: 'http',
  async request() {
    return {
      status,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    };
  },
});

const createWebAdapter = (message: string): HttpAdapter => ({
  source: 'fetch',
  async request() {
    throw new TypeError(message);
  },
});

describe('http-contracts integration parity (api + web)', () => {
  test('api-side non-2xx and web-side transport error both use shared taxonomy', async () => {
    const apiResult = await requestApi(createApiAdapter(409, { reason: 'already exists' }), {
      url: '/users',
      method: 'POST',
      parseAs: 'json',
    });

    const webResult = await requestApi(createWebAdapter('Failed to fetch'), {
      url: '/api/users',
      method: 'GET',
    });

    expect(isFail(apiResult)).toBe(true);
    expect(isFail(webResult)).toBe(true);

    if (!isFail(apiResult) || !isFail(webResult)) {
      throw new Error('Both results should be failures');
    }

    expect(apiResult.error.kind).toBe('transport');
    expect(webResult.error.kind).toBe('transport');

    expect(apiResult.error.source).toBe('http');
    expect(webResult.error.source).toBe('fetch');
    expect(webResult.error.code).toBe('NETWORK_ERROR');
  });
});
