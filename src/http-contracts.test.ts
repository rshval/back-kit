import { describe, expect, test } from 'vitest';
import { z } from 'zod';

import {
  createZodValidator,
  createZodValidatorFactory,
  fail,
  isFail,
  isOk,
  mapResult,
  normalizeHttpError,
  normalizeTransportError,
  ok,
  requestApi,
  unwrapOr,
  type HttpAdapter,
} from './http-contracts.js';

describe('http-contracts helpers', () => {
  test('ok/fail guards work with typed result', () => {
    const success = ok({ id: 'u_1' });
    const failure = fail(normalizeHttpError(new Error('Network error')));

    expect(isOk(success)).toBe(true);
    expect(isFail(success)).toBe(false);

    expect(isFail(failure)).toBe(true);
    expect(isOk(failure)).toBe(false);
  });

  test('mapResult maps data for success and preserves failure', () => {
    const success = ok({ count: 2 }, { status: 201, headers: { x: '1' } });
    const mappedSuccess = mapResult(success, (value) => value.count * 2);

    expect(mappedSuccess).toEqual(ok(4, { status: 201, headers: { x: '1' } }));

    const failure = fail(normalizeHttpError(new Error('Timeout')));
    const mappedFailure = mapResult(failure, (value: never) => value);

    expect(mappedFailure).toBe(failure);
  });

  test('unwrapOr returns fallback for failure', () => {
    expect(unwrapOr(ok('value'), 'fallback')).toBe('value');
    expect(unwrapOr(fail({ message: 'x' }), 'fallback')).toBe('fallback');
  });
});

describe('normalizeHttpError and requestApi', () => {
  test('normalizeHttpError defaults to transport kind', () => {
    const error = normalizeHttpError(new Error('Request aborted'));

    expect(error.kind).toBe('transport');
  });

  test('requestApi maps non-2xx responses to fail result', async () => {
    const adapter: HttpAdapter = {
      async request() {
        return {
          status: 422,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reason: 'validation failed' }),
        };
      },
    };

    const result = await requestApi(adapter, {
      url: '/users',
      method: 'POST',
      body: { name: '' },
      parseAs: 'json',
    });

    expect(isFail(result)).toBe(true);

    if (!isFail(result)) {
      throw new Error('Result should be failure');
    }

    expect(result.error.kind).toBe('transport');
    expect(result.status).toBe(422);
    expect(result.error.details).toEqual({ reason: 'validation failed' });
  });

  test('requestApi maps thrown fetch network error with adapter source', async () => {
    const adapter: HttpAdapter = {
      source: 'fetch',
      async request() {
        throw new TypeError('Failed to fetch');
      },
    };

    const result = await requestApi(adapter, {
      url: '/users',
      method: 'GET',
    });

    expect(isFail(result)).toBe(true);

    if (!isFail(result)) {
      throw new Error('Result should be failure');
    }

    expect(result.error.source).toBe('fetch');
    expect(result.error.kind).toBe('transport');
    expect(result.error.code).toBe('NETWORK_ERROR');
  });
});

describe('zod validators', () => {
  test('createZodValidator validates payload and returns parsed data', () => {
    const validator = createZodValidator(
      z.object({
        userId: z.string().uuid(),
        age: z.coerce.number().int().positive(),
      }),
    );

    const result = validator.validate({
      userId: 'e02d50f8-50f6-4ae8-a8dc-b2fd4ddfa56e',
      age: '31',
    });

    expect(isOk(result)).toBe(true);

    if (!isOk(result)) {
      throw new Error('Result should be success');
    }

    expect(result.data).toEqual({
      userId: 'e02d50f8-50f6-4ae8-a8dc-b2fd4ddfa56e',
      age: 31,
    });
  });

  test('createZodValidatorFactory applies shared options', () => {
    const createValidator = createZodValidatorFactory({
      includeInputInErrorDetails: true,
      code: 'DTO_INVALID',
    });

    const validator = createValidator(
      z.object({
        name: z.string().min(2),
      }),
    );

    const result = validator.validate({ name: '' });

    expect(isFail(result)).toBe(true);

    if (!isFail(result)) {
      throw new Error('Result should be failure');
    }

    expect(result.error.kind).toBe('validation');
    expect(result.error.code).toBe('DTO_INVALID');
    expect(result.error.details).toMatchObject({
      validator: 'zod',
      input: { name: '' },
      issues: [{ path: 'name' }],
    });
  });
});

describe('normalizeTransportError', () => {
  test('marks abort timeout with TIMEOUT code', () => {
    const error = new Error('Request timeout exceeded') as Error & { code: string };
    error.name = 'AbortError';
    error.code = 'TIMEOUT_ERR';

    const normalized = normalizeTransportError(error, { source: 'fetch' });

    expect(normalized.code).toBe('TIMEOUT');
    expect(normalized.isAbort).toBe(true);
    expect(normalized.isTimeout).toBe(true);
    expect(normalized.kind).toBe('transport');
  });
});
