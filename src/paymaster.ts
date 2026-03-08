import crypto from 'crypto';

export type PaymasterCallbackPayload = Record<
  string,
  string | number | undefined | null
>;

type HashAlgo = 'md5' | 'sha256';

type PaymentStatus = 'paid' | 'cancelled';

interface PaymasterConfig {
  merchantId: string;
  secretKey?: string;
  secretKeyDirect?: string;
  signatureAlgorithm?: string;
  checkoutUrl: string;
  currency?: string;
  successPath?: string;
  failPath?: string;
  notificationPathRequest?: string;
  notificationPathOrder?: string;
  checkSignature?: boolean;
}

interface PaymasterServiceOptions {
  paymaster: PaymasterConfig;
  clientServer: string;
  serverBaseUrl: string;
}

const normalize = (value: unknown) =>
  value === undefined || value === null ? '' : String(value);

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const generateSalt = () => crypto.randomBytes(8).toString('hex');
const hash = (algo: HashAlgo, value: string) =>
  crypto.createHash(algo).update(value).digest('hex');
const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);
const joinUrl = (base: string, path: string) =>
  `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

const resolveUrl = (
  base: string,
  maybePathOrUrl: string,
  fallbackPath: string,
) => {
  const raw = normalize(maybePathOrUrl).trim() || fallbackPath;

  if (!raw) return '';
  if (isAbsoluteUrl(raw)) return raw;

  return joinUrl(base, raw);
};

const buildSignBase = (payload: PaymasterCallbackPayload, secret: string) =>
  [
    normalize(payload.LMI_MERCHANT_ID),
    normalize(payload.LMI_PAYMENT_NO),
    normalize(payload.LMI_SYS_PAYMENT_ID),
    normalize(payload.LMI_SYS_PAYMENT_DATE),
    normalize(payload.LMI_PAYMENT_AMOUNT || payload.LMI_PAID_AMOUNT),
    normalize(payload.LMI_CURRENCY || payload.LMI_PAID_CURRENCY),
    normalize(payload.LMI_PAID_AMOUNT),
    normalize(payload.LMI_PAID_CURRENCY),
    normalize(payload.LMI_PAYMENT_SYSTEM),
    normalize(payload.LMI_SIM_MODE),
    secret,
  ].join(';');

export const createPaymasterService = ({
  paymaster,
  clientServer,
  serverBaseUrl,
}: PaymasterServiceOptions) => {
  const getPaymasterSecrets = () => {
    const direct = normalize(paymaster.secretKeyDirect).trim();
    const base = normalize(paymaster.secretKey).trim();

    return [direct, base].filter(Boolean);
  };

  const resolveSignatureAlgos = (): HashAlgo[] => {
    const configured = normalize(paymaster.signatureAlgorithm).toLowerCase();

    if (configured === 'md5') {
      return ['md5', 'sha256'];
    }

    return ['sha256', 'md5'];
  };

  return {
    createPaymentLink({
      requestId,
      amount,
      description,
      successUrl,
      failUrl,
      notificationPath,
      customerEmail,
      customerPhone,
      customerName,
      debug,
    }: {
      requestId: string;
      amount: number;
      description: string;
      successUrl?: string | null;
      failUrl?: string | null;
      notificationPath?: string;
      customerEmail?: string;
      customerPhone?: string;
      customerName?: string;
      debug?: boolean;
    }) {
      const paymentNo = `${requestId}-${Date.now()}`;
      const params = new URLSearchParams();

      params.set('LMI_MERCHANT_ID', paymaster.merchantId);
      params.set('LMI_PAYMENT_NO', paymentNo);
      params.set('LMI_PAYMENT_AMOUNT', amount.toFixed(2));
      params.set('LMI_CURRENCY', paymaster.currency || 'RUB');
      params.set('LMI_PAYMENT_DESC', description);
      params.set('LMI_PAYER_PHONE_NUMBER', normalize(customerPhone));
      params.set('LMI_PAYER_EMAIL', normalize(customerEmail));
      params.set('LMI_PAYER_FULL_NAME', normalize(customerName));
      params.set('LMI_PAYMENTFORM_DISABLED', '0');
      params.set('LMI_SALT', generateSalt());

      const resolvedSuccessUrl = resolveUrl(
        clientServer,
        successUrl ?? '',
        paymaster.successPath || '',
      );
      const resolvedFailUrl = resolveUrl(
        clientServer,
        failUrl ?? '',
        paymaster.failPath || '',
      );
      const fallbackNotificationPath =
        notificationPath ??
        (requestId.startsWith('order_')
          ? paymaster.notificationPathOrder
          : paymaster.notificationPathRequest) ??
        '';
      const resolvedNotificationUrl = resolveUrl(
        serverBaseUrl,
        '',
        fallbackNotificationPath,
      );

      if (resolvedSuccessUrl) params.set('LMI_SUCCESS_URL', resolvedSuccessUrl);
      if (resolvedFailUrl) {
        params.set('LMI_FAIL_URL', resolvedFailUrl);
        params.set('LMI_FAILURE_URL', resolvedFailUrl);
      }
      if (resolvedNotificationUrl)
        params.set('LMI_NOTIFICATION_URL', resolvedNotificationUrl);

      const response = {
        paymentNo,
        paymentUrl: `${paymaster.checkoutUrl}?${params.toString()}`,
        urls: {
          success: resolvedSuccessUrl,
          fail: resolvedFailUrl,
          notification: resolvedNotificationUrl,
        },
      };

      if (!debug) return response;

      return {
        ...response,
        effectivePayload: Object.fromEntries(params.entries()),
      };
    },

    validateCallback(payload: PaymasterCallbackPayload, rawBody = '') {
      if (!paymaster.checkSignature) return true;

      const receivedHash = normalize(
        payload.LMI_HASH || payload.hash,
      ).toLowerCase();
      if (!receivedHash) return false;

      const algos = resolveSignatureAlgos();
      const secrets = getPaymasterSecrets();

      for (const secret of secrets) {
        const signBase = buildSignBase(payload, secret);

        for (const algo of algos) {
          if (receivedHash === hash(algo, signBase)) return true;
        }

        if (rawBody) {
          const hmac = crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');
          if (receivedHash === hmac) return true;
        }
      }

      return false;
    },

    parseCallback(payload: PaymasterCallbackPayload): {
      requestId: string;
      paymentNo: string;
      paidAmount: number;
      status: PaymentStatus;
      statusRaw: string;
    } {
      const paymentNoRaw = normalize(payload.LMI_PAYMENT_NO);
      const requestId = paymentNoRaw.includes('-')
        ? paymentNoRaw.split('-')[0] || ''
        : paymentNoRaw;
      const paidAmount = toNumber(
        payload.LMI_PAID_AMOUNT || payload.LMI_PAYMENT_AMOUNT,
      );
      const statusRaw = normalize(
        payload.LMI_PAYMENT_STATUS || payload.LMI_STATUS,
      ).toLowerCase();
      const isSuccess =
        ['success', 'paid', 'processed'].includes(statusRaw) ||
        normalize(payload.LMI_PAYMENT_SYSTEM).length > 0;

      return {
        requestId,
        paymentNo: paymentNoRaw,
        paidAmount,
        status: isSuccess ? 'paid' : 'cancelled',
        statusRaw,
      };
    },
  };
};
