import type { ZodTypeAny, output } from 'zod';

export type ApiErrorKind = 'transport' | 'validation' | 'domain' | 'unknown';

export type ApiResult<TData, TError = ApiError> =
  | ApiSuccess<TData>
  | ApiFailure<TError>;

export interface ApiSuccess<T> {
  ok: true;
  status: number;
  headers: Record<string, string>;
  data: T;
}

export interface ApiFailure<TError = ApiError> {
  ok: false;
  status: number | null;
  headers?: Record<string, string>;
  error: TError;
}

export interface ApiError {
  /**
   * Optional for backward compatibility with repositories that still construct
   * legacy error objects manually. Internal helpers always return `kind`.
   */
  kind?: ApiErrorKind;
  message: string;
  code?: string;
  status?: number | null;
  details?: unknown;
  cause?: unknown;
  source: 'fetch' | 'capacitor-http' | 'http' | 'unknown';
  isAbort?: boolean;
  isTimeout?: boolean;
  responseBody?: string;
}

export interface AuthHeaderBuilderOptions {
  scheme?: 'Token' | 'Bearer' | (string & {});
}

export class AuthHeaderBuilder {
  private readonly scheme: string;

  constructor(options: AuthHeaderBuilderOptions = {}) {
    this.scheme = options.scheme ?? 'Token';
  }

  build(jwt: string): string {
    return `${this.scheme} ${jwt}`;
  }

  apply(headers: Record<string, string>, jwt: string): Record<string, string> {
    return {
      ...headers,
      Authorization: this.build(jwt),
    };
  }
}

export interface NormalizeHttpErrorOptions {
  source?: ApiError['source'];
  kind?: ApiErrorKind;
  status?: number | null;
  code?: string;
  details?: unknown;
  responseBody?: string;
}

const getErrorMessage = (value: unknown): string => {
  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === 'string') {
    return value;
  }

  return 'Unknown HTTP error';
};

export const normalizeHttpError = (
  error: unknown,
  options: NormalizeHttpErrorOptions = {},
): ApiError => {
  const isAbortError = error instanceof Error && error.name === 'AbortError';
  const timeoutCode =
    (error instanceof Error &&
      ((error as { code?: string }).code === 'ETIMEDOUT' ||
        (error as { code?: string }).code === 'TIMEOUT_ERR')) ||
    false;

  return {
    kind: options.kind ?? 'transport',
    message: getErrorMessage(error),
    source: options.source ?? 'unknown',
    status: options.status,
    code: options.code,
    details: options.details,
    cause: error,
    responseBody: options.responseBody,
    isAbort: isAbortError,
    isTimeout: timeoutCode,
  };
};

const NETWORK_ERROR_MESSAGES = [
  'failed to fetch',
  'network request failed',
  'networkerror',
  'load failed',
];

const isNetworkError = (error: unknown): boolean => {
  if (error instanceof TypeError) {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();
  return NETWORK_ERROR_MESSAGES.some((pattern) => message.includes(pattern));
};

export const normalizeTransportError = (
  error: unknown,
  options: NormalizeHttpErrorOptions = {},
): ApiError => {
  const normalized = normalizeHttpError(error, {
    ...options,
    kind: 'transport',
  });

  const resolvedCode =
    options.code ??
    (normalized.isTimeout
      ? 'TIMEOUT'
      : normalized.isAbort
        ? 'ABORTED'
        : isNetworkError(error)
          ? 'NETWORK_ERROR'
          : normalized.code);

  return {
    ...normalized,
    code: resolvedCode,
  };
};

export const ok = <TData>(
  data: TData,
  options: Pick<ApiSuccess<TData>, 'status' | 'headers'> = {
    status: 200,
    headers: {},
  },
): ApiSuccess<TData> => ({
  ok: true,
  data,
  status: options.status,
  headers: options.headers,
});

export const fail = <TError>(
  error: TError,
  options: Pick<ApiFailure<TError>, 'status' | 'headers'> = {
    status: null,
    headers: {},
  },
): ApiFailure<TError> => ({
  ok: false,
  error,
  status: options.status,
  headers: options.headers,
});

export const isOk = <TData, TError>(
  result: ApiResult<TData, TError>,
): result is ApiSuccess<TData> => result.ok;

export const isFail = <TData, TError>(
  result: ApiResult<TData, TError>,
): result is ApiFailure<TError> => !result.ok;

export const mapResult = <TData, TError, TNextData>(
  result: ApiResult<TData, TError>,
  mapper: (value: TData) => TNextData,
): ApiResult<TNextData, TError> => {
  if (isFail(result)) {
    return result;
  }

  return ok(mapper(result.data), {
    status: result.status,
    headers: result.headers,
  });
};

export const unwrapOr = <TData, TError>(
  result: ApiResult<TData, TError>,
  fallback: TData,
): TData => (isOk(result) ? result.data : fallback);

export interface ValidationIssue {
  path: string;
  message: string;
  code?: string;
}

export interface ValidationErrorDetails {
  validator: 'zod';
  issues: ValidationIssue[];
  input?: unknown;
}

export interface RuntimeValidator<TInput, TOutput> {
  validate(input: TInput): ApiResult<TOutput, ApiError>;
}

export interface CreateZodValidatorOptions {
  includeInputInErrorDetails?: boolean;
  code?: string;
}

const mapZodIssuePath = (path: ReadonlyArray<PropertyKey>): string =>
  path.map((segment) => String(segment)).join('.');

const createValidationDetails = (
  issues: ReadonlyArray<{
    path: ReadonlyArray<PropertyKey>;
    message: string;
    code?: string;
  }>,
  input: unknown,
  options: CreateZodValidatorOptions,
): ValidationErrorDetails => {
  const details: ValidationErrorDetails = {
    validator: 'zod',
    issues: issues.map((issue) => ({
      path: mapZodIssuePath(issue.path),
      message: issue.message,
      code: issue.code,
    })),
  };

  if (options.includeInputInErrorDetails) {
    details.input = input;
  }

  return details;
};

export const createZodValidator = <TSchema extends ZodTypeAny>(
  schema: TSchema,
  options: CreateZodValidatorOptions = {},
): RuntimeValidator<unknown, output<TSchema>> => ({
  validate(input) {
    const parsed = schema.safeParse(input);

    if (parsed.success) {
      return ok(parsed.data);
    }

    return fail(
      normalizeHttpError(new Error('Validation failed'), {
        kind: 'validation',
        source: 'unknown',
        code: options.code ?? 'VALIDATION_ERROR',
        details: createValidationDetails(parsed.error.issues, input, options),
      }),
    );
  },
});

export const createZodValidatorFactory =
  (options: CreateZodValidatorOptions = {}) =>
  <TSchema extends ZodTypeAny>(
    schema: TSchema,
    localOptions: CreateZodValidatorOptions = {},
  ): RuntimeValidator<unknown, output<TSchema>> =>
    createZodValidator(schema, { ...options, ...localOptions });

export interface HttpRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface HttpAdapter {
  source?: ApiError['source'];
  request(request: HttpRequest): Promise<HttpResponse>;
}

const ABORT_FALLBACK_ERROR_NAME = 'AbortError';

const createAbortError = (message: string): Error => {
  if (typeof DOMException === 'function') {
    return new DOMException(message, ABORT_FALLBACK_ERROR_NAME);
  }

  const error = new Error(message);
  error.name = ABORT_FALLBACK_ERROR_NAME;
  return error;
};

const createTimeoutError = (): Error => {
  const error = createAbortError('Request timeout exceeded');
  (error as Error & { code?: string }).code = 'TIMEOUT_ERR';
  return error;
};

interface AbortRuntime {
  signal: AbortSignal;
  cleanup: () => void;
}

const createAbortRuntime = (
  signal?: AbortSignal,
  timeoutMs?: number,
): AbortRuntime => {
  const controller = new AbortController();
  const cleanupFns: Array<() => void> = [];

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason ?? createAbortError('Request aborted'));
    } else {
      const onAbort = () =>
        controller.abort(signal.reason ?? createAbortError('Request aborted'));
      signal.addEventListener('abort', onAbort, { once: true });
      cleanupFns.push(() => signal.removeEventListener('abort', onAbort));
    }
  }

  if (
    typeof timeoutMs === 'number' &&
    Number.isFinite(timeoutMs) &&
    timeoutMs > 0
  ) {
    const timeout = setTimeout(
      () => controller.abort(createTimeoutError()),
      timeoutMs,
    );
    cleanupFns.push(() => clearTimeout(timeout));
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      cleanupFns.forEach((fn) => fn());
    },
  };
};

const normalizeHeaders = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return { ...headers };
};

export const createFetchAdapter = (
  fetchImplementation: typeof fetch = fetch,
): HttpAdapter => ({
  source: 'fetch',
  async request(request) {
    const runtime = createAbortRuntime(request.signal, request.timeoutMs);

    try {
      const response = await fetchImplementation(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        signal: runtime.signal,
      });

      return {
        status: response.status,
        headers: normalizeHeaders(response.headers),
        body: await response.text(),
      };
    } finally {
      runtime.cleanup();
    }
  },
});

export interface CapacitorHttpClient {
  request(options: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    data?: unknown;
    connectTimeout?: number;
    readTimeout?: number;
    responseType?: 'text' | 'json' | 'arraybuffer' | 'blob';
  }): Promise<{
    status: number;
    headers?: Record<string, string>;
    data?: unknown;
  }>;
}

export const createCapacitorHttpAdapter = (
  httpClient: CapacitorHttpClient,
): HttpAdapter => ({
  source: 'capacitor-http',
  async request(request) {
    const runtime = createAbortRuntime(request.signal, request.timeoutMs);

    try {
      const response = await Promise.race([
        httpClient.request({
          url: request.url,
          method: request.method,
          headers: request.headers,
          data: request.body,
          connectTimeout: request.timeoutMs,
          readTimeout: request.timeoutMs,
          responseType: 'text',
        }),
        new Promise<never>((_, reject) => {
          runtime.signal.addEventListener(
            'abort',
            () =>
              reject(
                runtime.signal.reason ?? createAbortError('Request aborted'),
              ),
            { once: true },
          );
        }),
      ]);

      return {
        status: response.status,
        headers: response.headers ?? {},
        body:
          typeof response.data === 'string'
            ? response.data
            : JSON.stringify(response.data ?? ''),
      };
    } finally {
      runtime.cleanup();
    }
  },
});

const isXmlLike = (text: string): boolean => {
  const trimmed = text.trimStart();
  return trimmed.startsWith('<?xml') || trimmed.startsWith('<');
};

const parseBody = <T>(
  body: string,
  contentType: string | undefined,
): T | string | null => {
  if (!body) {
    return null;
  }

  const normalizedType = contentType?.toLowerCase();

  if (normalizedType?.includes('xml') || isXmlLike(body)) {
    return body;
  }

  if (
    normalizedType?.includes('json') ||
    body.trimStart().startsWith('{') ||
    body.trimStart().startsWith('[')
  ) {
    return JSON.parse(body) as T;
  }

  return body;
};

export interface RequestWithParseOptions extends Omit<HttpRequest, 'body'> {
  body?: unknown;
  parseAs?: 'auto' | 'json' | 'xml' | 'text';
}

export const requestApi = async <T = unknown>(
  adapter: HttpAdapter,
  request: RequestWithParseOptions,
): Promise<ApiResult<T | string | null, ApiError>> => {
  try {
    const response = await adapter.request({
      ...request,
      body:
        typeof request.body === 'string' || request.body === undefined
          ? request.body
          : JSON.stringify(request.body),
    });

    const contentType =
      response.headers['content-type'] ?? response.headers['Content-Type'];

    const parsed =
      request.parseAs === 'text'
        ? response.body
        : request.parseAs === 'xml'
          ? response.body
          : request.parseAs === 'json'
            ? response.body
              ? (JSON.parse(response.body) as T)
              : null
            : parseBody<T>(response.body, contentType);

    if (response.status >= 200 && response.status < 300) {
      return ok(parsed as T | string | null, {
        status: response.status,
        headers: response.headers,
      });
    }

    return fail(
      normalizeHttpError(new Error(`HTTP ${response.status}`), {
        source: 'http',
        kind: 'transport',
        status: response.status,
        responseBody: response.body,
        details: parsed,
      }),
      {
        status: response.status,
        headers: response.headers,
      },
    );
  } catch (error) {
    const normalized = normalizeTransportError(error, {
      source: adapter.source ?? 'unknown',
    });

    return fail(normalized, { status: normalized.status ?? null, headers: {} });
  }
};

export {
  runHttpContractsGuardCodemod,
  type HttpContractsGuardCodemodOptions,
  type HttpContractsGuardCodemodResult,
} from './http-contracts-migration-codemod.js';
export {
  httpContractsMigrationEslintPlugin,
  noResultOkRule,
} from './http-contracts-eslint-rule.js';
