# @rshval/back-kit

Public npm package `@rshval/back-kit` with server-side utilities for Node.js/TypeScript projects.

> This repository is used for the author's internal projects. Any third-party usage is at your own risk.

## Installation

```bash
npm i @rshval/back-kit
```

The package is ESM-only (`"type": "module"`). For CommonJS, use dynamic `import()`.

## Quick navigation

- [Email](#1-email)
- [Config and JWT](#2-config-and-jwt)
- [Helper utilities](#3-helper-utilities)
- [Validation](#4-validation)
- [Builders](#5-builders-config-bound)
- [Database](#6-database)
- [Cache](#7-cache)
- [Logging](#8-logging)
- [WebSocket client](#9-websocket-client)
- [Paymaster](#10-paymaster)
- [Mail templates](#11-mail-templates)
- [Audit changes](#12-audit-changes)
- [Seed functions](#13-seed-functions)
- [API client](#14-api-client)

---

## API and usage examples

Below are the public exports from the package (via `src/index.ts`) with short examples. For key APIs, there are separate **production examples** that show practical integration patterns for real services.

### 1) Email

#### `createMailOptions({ from, to, subject, text })`

Creates a nodemailer mail options object. Supports `to` as a string (regular send) or a form object (`MailOptionsBody`) for requests/feedback scenarios.

```ts
import { createMailOptions } from '@rshval/back-kit';

const options = createMailOptions({
  from: 'robot@example.com',
  to: 'user@example.com',
  subject: 'Hello',
  text: 'Welcome!',
});
```

#### `sendEmailWithConfig({ nodemailerConfig, to, subject, text })`

Creates a nodemailer transport, sends an email, and returns a string with the send result.

```ts
import { sendEmailWithConfig } from '@rshval/back-kit';

await sendEmailWithConfig({
  nodemailerConfig: {
    host: 'smtp.example.com',
    port: 465,
    secure: true,
    auth: { user: 'robot@example.com', pass: '***' },
  },
  to: 'user@example.com',
  subject: 'Reset password',
  text: 'Code: 123456',
});
```

**Production example**:

```ts
import { buildSendEmail } from '@rshval/back-kit';

const sendEmailWithConfig = buildSendEmail(runtimeConfig);
await sendEmailWithConfig(to, subject, text);
```

---

### 2) Config and JWT

#### `getBaseUrlByConfig(config, baseUrl?)`

Builds a base URL from app config. In `development`, adds `:port`.

```ts
import { getBaseUrlByConfig } from '@rshval/back-kit';

const base = getBaseUrlByConfig(
  {
    NODE_ENV: 'development',
    server: { domain: 'localhost', port: 3000 },
    jwt: {},
  },
  '/api',
);
// //localhost:3000/api
```

#### `createTokenByConfig({ config, user, expiresIn })`

Creates a JWT token based on `config.jwt.JWT_KEY` (or `JWT_KEY_NO_ENV`).

```ts
import { createTokenByConfig } from '@rshval/back-kit';

const token = createTokenByConfig({
  config: {
    server: { domain: 'example.com' },
    jwt: { JWT_KEY: 'super-secret' },
  },
  user: { _id: '64a...' },
  expiresIn: '7d',
});
```

---

### 3) Helper utilities

#### `createPinCode(min?, max?)`

Generates a random numeric PIN in range (`10000..99990` by default).

```ts
import { createPinCode } from '@rshval/back-kit';

const pin = createPinCode();
```

#### `getIp(req)`

Attempts to detect client IP from `req.ip`, sockets, and `x-forwarded-for`.

```ts
import { getIp } from '@rshval/back-kit';

const ip = await getIp(req);
```

#### `translitUrl(str)`

Transliterates a string into a URL-friendly slug (`-`, lower-case).

```ts
import { translitUrl } from '@rshval/back-kit';

const slug = translitUrl('Page example');
// primer-stranicy
```

---

### 4) Validation

#### `patternEmail()`

Returns a RegExp for email validation.

#### `patternPassword()`

Returns a RegExp for password validation (at least 8 chars, letters + digits).

#### `isValidEmail(val)`

Checks whether an email is valid.

#### `isValidPhoneNumber(val)`

Validates a phone number via `libphonenumber-js`.

#### `isValidCode(code, length)`

Checks code length.

#### `isEmpty(val)`

Checks for an empty string (`trim`) or an empty object.

```ts
import {
  patternEmail,
  patternPassword,
  isValidEmail,
  isValidPhoneNumber,
  isValidCode,
  isEmpty,
} from '@rshval/back-kit';

const emailRegex = patternEmail();
const passwordRegex = patternPassword();

isValidEmail('user@example.com'); // true
isValidPhoneNumber('+79991234567'); // true/false
isValidCode('123456', 6); // true
isEmpty('   '); // true
isEmpty({}); // true
```

---

### 5) Builders (config-bound)

#### `buildGetBaseUrl(config)`

Returns a function `(baseUrl?) => string`.

#### `buildCreateToken(config)`

Returns a JWT creator function with pre-bound config.

#### `buildSendEmail(nodemailerConfig)`

Returns an email sender function with pre-bound SMTP config.

```ts
import {
  buildGetBaseUrl,
  buildCreateToken,
  buildSendEmail,
} from '@rshval/back-kit';

const getBaseUrl = buildGetBaseUrl({
  NODE_ENV: 'production',
  server: { domain: 'example.com' },
  jwt: { JWT_KEY: 'secret' },
});

const createToken = buildCreateToken({
  server: { domain: 'example.com' },
  jwt: { JWT_KEY: 'secret' },
});

const sendEmail = buildSendEmail({
  host: 'smtp.example.com',
  port: 465,
  secure: true,
  auth: { user: 'robot@example.com', pass: '***' },
});
```

---

### 6) Database

#### `startMongoDatabase(options)`

Starts MongoDB connection via mongoose, logs statuses, and supports connection retries.

```ts
import { startMongoDatabase } from '@rshval/back-kit';

await startMongoDatabase({
  config: {
    name: 'main',
    connect: process.env.MONGO_URI,
    params: {},
  },
  logger: console,
});
```

**Production example**:

```ts
await startMongoDatabase({
  config: config.database,
  logger,
  setCacheStatus: (status) =>
    cache.set(cacheIdDatabase, { status }, undefined, undefined, cacheTtl30m),
});
```

---

### 7) Cache

#### `createCacheService(options?)`

Creates an LRU cache service with methods:

- `get(key)`
- `set(key, data, compareKey?, compareValue?, ttlMs?)`
- `delete(key)`
- `getId(val)`
- `keys()`
- `clear()`
- `entries()` _(if `exposeEntries: true`)_
- `values()` _(if `exposeValues: true`)_

```ts
import { createCacheService } from '@rshval/back-kit';

const cache = createCacheService({ ttl: 60_000 });
const key = cache.getId({ service: 'users', page: 1 });
await cache.set(key, [{ s: 'state', data: [1, 2, 3] }]);
const value = await cache.get(key);
```

#### `createCacheMiddleware({ cache, ... })`

Creates a middleware wrapper over the cache service with methods:

- `get(id)`
- `set(id, data, expDataTime)`
- `del(id)`
- `delByPrefix(prefix)` _(if `includeDelByPrefix: true`)_

```ts
import { createCacheService, createCacheMiddleware } from '@rshval/back-kit';

const cache = createCacheService({ supportTtlInSet: true });
const cm = createCacheMiddleware({
  cache,
  passTtlToCacheSet: true,
  includeDelByPrefix: true,
});

await cm.set('users:list', [{ id: 1 }], 60_000);
const cached = await cm.get('users:list');
await cm.delByPrefix?.('users:');
```

**Production example**:

```ts
const cache = createCacheService({ supportTtlInSet: true });
const cacheMiddleware = createCacheMiddleware({
  cache,
  passTtlToCacheSet: true,
  includeDelByPrefix: true,
});

export const { get, set, del } = cacheMiddleware;
export const delByPrefix = cacheMiddleware.delByPrefix!;
```

---

### 8) Logging

#### `createLoggerService({ rootdir? })`

Returns a logger factory. For each namespace (`std`) it writes:

- `logs/<std>/stdout.log`
- `logs/<std>/stderr.log`

```ts
import { createLoggerService } from '@rshval/back-kit';

const makeLogger = createLoggerService({ rootdir: process.cwd() });
const logger = makeLogger('api');
logger.log('started');
```

**Production example**:

```ts
const loggerService = createLoggerService();
const logger = loggerService('api');
```

---

### 9) WebSocket client

#### `createSocketClientService(options)`

Creates a `socket.io` client service with methods:

- `doSocketClient()` — start connection
- `getSocketClient()` — return current instance

```ts
import { createSocketClientService } from '@rshval/back-kit';

const ws = createSocketClientService({
  wsName: 'worker',
  socketBase: 'https://example.com',
  logger: console,
  runWorkers: () => {
    // jobs
  },
});

ws.doSocketClient();
```

**Production example**:

```ts
const socketClientService = createSocketClientService({
  wsName: config.ws.name,
  socketBase: SOCKET_BASE,
  logger,
  runWorkers: socketClientWorkers,
  socketClientInterval: config.settings.socketClientInterval,
});

socketClientService.doSocketClient();
```

---

### 10) Paymaster

#### `createPaymasterService({ paymaster, clientServer, serverBaseUrl })`

Creates a service with methods:

- `createPaymentLink({...})` — build payment URL
- `validateCallback(payload, rawBody?)` — verify callback signature
- `parseCallback(payload)` — normalize callback into a convenient object
- `syncPaymentStatus({ paymentNo, merchantId? })` — safe PSP status sync (returns `null` on any API error), normalized status: `paid | cancelled | pending | refunded`
- `createRefund({ paymentNo, amount, currency, reason, merchantId? })` — request refund via provider API

```ts
import { createPaymasterService } from '@rshval/back-kit';

const paymaster = createPaymasterService({
  paymaster: {
    merchantId: 'merchant-id',
    secretKey: 'secret',
    checkoutUrl: 'https://paymaster.ru/Payment/Init',
    checkSignature: true,
    statusApiUrl: process.env.PAYMASTER_STATUS_API_URL,
    statusApiToken: process.env.PAYMASTER_STATUS_API_TOKEN,
    statusApiTimeoutMs: Number(process.env.PAYMASTER_STATUS_API_TIMEOUT_MS || 8000),
    refundApiUrl: process.env.PAYMASTER_REFUND_API_URL,
    refundApiToken: process.env.PAYMASTER_REFUND_API_TOKEN,
    refundApiTimeoutMs: Number(process.env.PAYMASTER_REFUND_API_TIMEOUT_MS || 8000),
  },
  clientServer: 'https://site.example.com',
  serverBaseUrl: 'https://api.example.com',
});

const link = paymaster.createPaymentLink({
  requestId: 'order_123',
  amount: 1499,
  description: 'Order #123',
});

const synced = await paymaster.syncPaymentStatus({
  paymentNo: link.paymentNo,
});

if (!synced) {
  // Safe fallback: keep local status unchanged or schedule retry
} else {
  // status: 'paid' | 'cancelled' | 'pending' | 'refunded'
  console.log(synced.status, synced.statusRaw);
}

const refund = await paymaster.createRefund({
  paymentNo: link.paymentNo,
  amount: 1499,
  reason: 'Customer requested cancellation',
  // optional
  currency: 'RUB',
});

if (!refund.success) {
  console.error(refund.error, refund.httpStatus, refund.statusRaw);
}
```

**Status API environment variables**:

- `PAYMASTER_STATUS_API_URL`
- `PAYMASTER_STATUS_API_TOKEN`
- `PAYMASTER_STATUS_API_TIMEOUT_MS`

**Refund API environment variables**:

- `PAYMASTER_REFUND_API_URL`
- `PAYMASTER_REFUND_API_TOKEN`
- `PAYMASTER_REFUND_API_TIMEOUT_MS`

**Production example**:

```ts
export const paymasterService = createPaymasterService({
  paymaster: config.platforms.paymaster,
  clientServer: config.clientServer,
  serverBaseUrl: config.server.baseUrl,
});
```

---

### 11) Mail templates

#### `createMailTemplateService({ findTemplate, sendEmail })`

Creates an email template service with methods:

- `extractVariables(template)` — list of `{{variables}}`
- `renderTemplate(template, context?)` — render subject/body
- `sendByKey({ key, to, context? })` — find template, render, and send

```ts
import { createMailTemplateService } from '@rshval/back-kit';

const mailTemplates = createMailTemplateService({
  findTemplate: async ({ key }) =>
    key === 'welcome'
      ? { subject: 'Hi, {{user.name}}', bodyText: 'Hello {{user.name}}!' }
      : null,
  sendEmail: async (to, subject, text) => {
    console.log('send', to, subject, text);
  },
});

await mailTemplates.sendByKey({
  key: 'welcome',
  to: 'user@example.com',
  context: { user: { name: 'Alex' } },
});
```

**Production example**:

```ts
const sendEmailWithConfig = buildSendEmail(runtimeConfig);

export const mailTemplateService = createMailTemplateService({
  findTemplate: ({ key }) => MailTemplate.findOne({ key, isActive: true }),
  sendEmail: sendEmailWithConfig,
});
```

---

### 12) Audit changes

#### `buildAuditChanges({ beforeData, afterData, fieldsToCheck, protectedFields? })`

Compares before/after data and returns an array of changes for selected fields.

#### `createAuditLog({ ..., save })`

Creates an audit record via provided `save` function. Returns `null` when no changes exist.

```ts
import { buildAuditChanges, createAuditLog } from '@rshval/back-kit';

const changes = buildAuditChanges({
  beforeData: { name: 'Old', role: 'user' },
  afterData: { name: 'New', role: 'user' },
  fieldsToCheck: ['name', 'role'],
  protectedFields: ['role'],
});

await createAuditLog({
  entityType: 'user',
  entityId: '507f1f77bcf86cd799439011',
  action: 'update',
  changedBy: '507f191e810c19729de860ea',
  changes,
  save: async (payload) => payload,
});
```

**Production example**:

```ts
await createAuditLog({
  entityType,
  entityId,
  action,
  changedBy,
  changes,
  meta,
  save: async (payload) => AuditLog.create(payload),
});
```

---

### 13) Seed functions

#### `createSeedFunctions({ cache, retryDelayMs? })`

Returns methods:

- `checkDatabaseIsConnected()` — checks DB state via cache
- `setSeedData(SeedModel, arr)` — inserts seed data after connection check

```ts
import { createSeedFunctions, createCacheService } from '@rshval/back-kit';

const cache = createCacheService();
const { setSeedData } = createSeedFunctions({ cache });

// await setSeedData(UserModel, [{ name: 'Admin' }])
```

**Production example**:

```ts
export const { checkDatabaseIsConnected, setSeedData } = createSeedFunctions({
  cache,
});
```

---

### 14) API client

#### `createApiService({ userAgent, logger? })`

Returns an HTTP client with methods:

- `get(path, token?)`
- `getXml(path, token?)`
- `del(path, token?)`
- `post(path, data, token?, xml?, contentType?)`
- `put(path, data, token)`

```ts
import { createApiService } from '@rshval/back-kit';

const api = createApiService({
  userAgent: 'my-service/1.0.0',
  logger: console,
});

const users = await api.get('https://api.example.com/users');
const created = await api.post('https://api.example.com/users', {
  name: 'Alex',
});
```

**Production example**:

```ts
const apiService = createApiService({
  userAgent: config.api.userAgent,
  logger,
});

export const { get, getXml, del, post, put } = apiService;
```

Token type is also exported:

```ts
import type { Token } from '@rshval/back-kit';
```

---

### 15) Other exported utilities

#### `add(a, b)`

Returns the sum of two numbers.

#### `test2()`

Logs `99` and returns `8`.

```ts
import { add, test2 } from '@rshval/back-kit';

add(2, 3); // 5
test2(); // 8
```

---

## Preparing for npm publication

See detailed guide: [`docs/publishing.md`](docs/publishing.md).

Short wording for npm description:

- A set of service factories (`create*`, `build*`) and ready-to-use utilities/validators.
- DI-friendly API: dependencies are injected externally (`logger`, `cache`, `save`, `findTemplate`).
- Important behavior options (`supportTtlInSet`, `passTtlToCacheSet`, `includeDelByPrefix`) should be documented near examples.

---

## Development (standalone)

```bash
npm install
npm run build
```

## Exports

- ESM: `dist/index.js`
- Types: `dist/index.d.ts`
