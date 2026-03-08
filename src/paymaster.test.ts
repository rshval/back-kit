import { describe, expect, test } from 'vitest';

import { createPaymasterService } from './paymaster.js';

const createService = () =>
  createPaymasterService({
    paymaster: {
      merchantId: 'merchant-1',
      checkoutUrl: 'https://paymaster.example/checkout',
    },
    clientServer: 'https://client.example',
    serverBaseUrl: 'https://api.example',
  });

const getQueryParams = (paymentUrl: string) =>
  new URL(paymentUrl).searchParams;

describe('paymaster createPaymentLink', () => {
  test('serializes only successUrl when failUrl is missing', () => {
    const service = createService();

    const result = service.createPaymentLink({
      requestId: 'request_1',
      amount: 100,
      description: 'test',
      successUrl: 'https://client.example/success',
    });

    const params = getQueryParams(result.paymentUrl);

    expect(params.get('LMI_SUCCESS_URL')).toBe('https://client.example/success');
    expect(params.get('LMI_FAIL_URL')).toBeNull();
    expect(params.get('LMI_FAILURE_URL')).toBeNull();
  });

  test('serializes both successUrl and failUrl', () => {
    const service = createService();

    const result = service.createPaymentLink({
      requestId: 'request_2',
      amount: 100,
      description: 'test',
      successUrl: 'https://client.example/success',
      failUrl: 'https://client.example/fail',
    });

    const params = getQueryParams(result.paymentUrl);

    expect(params.get('LMI_SUCCESS_URL')).toBe('https://client.example/success');
    expect(params.get('LMI_FAIL_URL')).toBe('https://client.example/fail');
    expect(params.get('LMI_FAILURE_URL')).toBe('https://client.example/fail');
  });

  test('keeps failUrl with query and special symbols and returns effectivePayload in debug mode', () => {
    const service = createService();
    const failUrl =
      'https://client.example/fail?reason=declined&message=Оплата не прошла&from=paymaster';

    const result = service.createPaymentLink({
      requestId: 'request_3',
      amount: 100,
      description: 'test',
      successUrl: 'https://client.example/success',
      failUrl,
      debug: true,
    });

    const params = getQueryParams(result.paymentUrl);

    expect(params.get('LMI_FAIL_URL')).toBe(failUrl);
    expect(result.effectivePayload.LMI_FAIL_URL).toBe(failUrl);
    expect(result.effectivePayload.LMI_FAILURE_URL).toBe(failUrl);
    expect(result.effectivePayload.LMI_SUCCESS_URL).toBe(
      'https://client.example/success',
    );
  });
});
