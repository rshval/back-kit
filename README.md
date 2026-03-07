# @rshval/back-kit

Публичный npm-пакет `@rshval/back-kit` с серверными утилитами для Node.js/TypeScript проектов.

> Репозиторий используется для внутренних проектов автора. Любое использование третьими лицами выполняется на их страх и риск.

## Установка

```bash
npm i @rshval/back-kit
```

Пакет ESM-only (`"type": "module"`). Для CommonJS используйте динамический `import()`.

## Быстрая навигация

- [Email](#1-email)
- [Конфиг и JWT](#2-конфиг-и-jwt)
- [Вспомогательные утилиты](#3-вспомогательные-утилиты)
- [Валидация](#4-валидация)
- [Билдеры](#5-билдеры-привязка-к-конфигу)
- [База данных](#6-база-данных)
- [Кэш](#7-кэш)
- [Логирование](#8-логирование)
- [WebSocket клиент](#9-websocket-клиент)
- [Paymaster](#10-paymaster)
- [Почтовые шаблоны](#11-почтовые-шаблоны)
- [Аудит изменений](#12-аудит-изменений)
- [Seed-функции](#13-seed-функции)
- [API-клиент](#14-api-клиент)

---

## API и примеры использования

Ниже перечислены публичные экспорты из пакета (через `src/index.ts`) с короткими примерами. Для ключевых API добавлены отдельные **продакшен-примеры** с паттернами интеграции в реальный сервис.

### 1) Email

#### `createMailOptions({ from, to, subject, text })`

Создаёт объект параметров письма для nodemailer. Поддерживает `to` как строку (обычная отправка) или объект формы (`MailOptionsBody`) для заявок/обратной связи.

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

Создаёт transport через nodemailer, отправляет письмо и возвращает строку с результатом отправки.

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

**Продакшен-пример**:

```ts
import { buildSendEmail } from '@rshval/back-kit';

const sendEmailWithConfig = buildSendEmail(runtimeConfig);
await sendEmailWithConfig(to, subject, text);
```

---

### 2) Конфиг и JWT

#### `getBaseUrlByConfig(config, baseUrl?)`

Строит base URL по конфигу приложения. В `development` добавляет `:port`.

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

Создаёт JWT-токен на основе `config.jwt.JWT_KEY` (или `JWT_KEY_NO_ENV`).

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

### 3) Вспомогательные утилиты

#### `createPinCode(min?, max?)`

Генерирует случайный числовой PIN в диапазоне (`10000..99990` по умолчанию).

```ts
import { createPinCode } from '@rshval/back-kit';

const pin = createPinCode();
```

#### `getIp(req)`

Пытается определить IP клиента из `req.ip`, сокетов и `x-forwarded-for`.

```ts
import { getIp } from '@rshval/back-kit';

const ip = await getIp(req);
```

#### `translitUrl(str)`

Транслитерирует строку в URL-friendly slug (`-`, lower-case).

```ts
import { translitUrl } from '@rshval/back-kit';

const slug = translitUrl('Пример страницы');
// primer-stranicy
```

---

### 4) Валидация

#### `patternEmail()`

Возвращает RegExp для проверки email.

#### `patternPassword()`

Возвращает RegExp для пароля (минимум 8 символов, буквы + цифры).

#### `isValidEmail(val)`

Проверяет корректность email.

#### `isValidPhoneNumber(val)`

Проверяет номер телефона через `libphonenumber-js`.

#### `isValidCode(code, length)`

Проверяет длину кода.

#### `isEmpty(val)`

Проверяет пустую строку (`trim`) или пустой объект.

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

### 5) Билдеры (привязка к конфигу)

#### `buildGetBaseUrl(config)`

Возвращает функцию `(baseUrl?) => string`.

#### `buildCreateToken(config)`

Возвращает функцию создания JWT с уже «зашитым» конфигом.

#### `buildSendEmail(nodemailerConfig)`

Возвращает функцию отправки email с уже «зашитым» SMTP-конфигом.

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

### 6) База данных

#### `startMongoDatabase(options)`

Запускает подключение к MongoDB через mongoose, логирует статусы и умеет ретраить подключение.

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

**Продакшен-пример**:

```ts
await startMongoDatabase({
  config: config.database,
  logger,
  setCacheStatus: (status) =>
    cache.set(cacheIdDatabase, { status }, undefined, undefined, cacheTtl30m),
});
```

---

### 7) Кэш

#### `createCacheService(options?)`

Создаёт LRU cache-сервис с методами:

- `get(key)`
- `set(key, data, compareKey?, compareValue?, ttlMs?)`
- `delete(key)`
- `getId(val)`
- `keys()`
- `clear()`
- `entries()` _(если `exposeEntries: true`)_
- `values()` _(если `exposeValues: true`)_

```ts
import { createCacheService } from '@rshval/back-kit';

const cache = createCacheService({ ttl: 60_000 });
const key = cache.getId({ service: 'users', page: 1 });
await cache.set(key, [{ s: 'state', data: [1, 2, 3] }]);
const value = await cache.get(key);
```

#### `createCacheMiddleware({ cache, ... })`

Создаёт middleware-обёртку над cache-сервисом с методами:

- `get(id)`
- `set(id, data, expDataTime)`
- `del(id)`
- `delByPrefix(prefix)` _(если `includeDelByPrefix: true`)_

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

**Продакшен-пример**:

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

### 8) Логирование

#### `createLoggerService({ rootdir? })`

Возвращает фабрику логгеров. Для каждого namespace (`std`) пишет:

- `logs/<std>/stdout.log`
- `logs/<std>/stderr.log`

```ts
import { createLoggerService } from '@rshval/back-kit';

const makeLogger = createLoggerService({ rootdir: process.cwd() });
const logger = makeLogger('api');
logger.log('started');
```

**Продакшен-пример**:

```ts
const loggerService = createLoggerService();
const logger = loggerService('api');
```

---

### 9) WebSocket клиент

#### `createSocketClientService(options)`

Создаёт сервис клиента `socket.io` с методами:

- `doSocketClient()` — старт подключения
- `getSocketClient()` — вернуть текущий инстанс

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

**Продакшен-пример**:

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

Создаёт сервис с методами:

- `createPaymentLink({...})` — сформировать ссылку на оплату
- `validateCallback(payload, rawBody?)` — проверить подпись callback
- `parseCallback(payload)` — нормализовать callback в удобный объект

```ts
import { createPaymasterService } from '@rshval/back-kit';

const paymaster = createPaymasterService({
  paymaster: {
    merchantId: 'merchant-id',
    secretKey: 'secret',
    checkoutUrl: 'https://paymaster.ru/Payment/Init',
    checkSignature: true,
  },
  clientServer: 'https://site.example.com',
  serverBaseUrl: 'https://api.example.com',
});

const link = paymaster.createPaymentLink({
  requestId: 'order_123',
  amount: 1499,
  description: 'Order #123',
});
```

**Продакшен-пример**:

```ts
export const paymasterService = createPaymasterService({
  paymaster: config.platforms.paymaster,
  clientServer: config.clientServer,
  serverBaseUrl: config.server.baseUrl,
});
```

---

### 11) Почтовые шаблоны

#### `createMailTemplateService({ findTemplate, sendEmail })`

Создаёт сервис шаблонов email с методами:

- `extractVariables(template)` — список `{{variables}}`
- `renderTemplate(template, context?)` — рендер subject/body
- `sendByKey({ key, to, context? })` — найти шаблон, отрендерить и отправить

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

**Продакшен-пример**:

```ts
const sendEmailWithConfig = buildSendEmail(runtimeConfig);

export const mailTemplateService = createMailTemplateService({
  findTemplate: ({ key }) => MailTemplate.findOne({ key, isActive: true }),
  sendEmail: sendEmailWithConfig,
});
```

---

### 12) Аудит изменений

#### `buildAuditChanges({ beforeData, afterData, fieldsToCheck, protectedFields? })`

Сравнивает данные «до/после» и возвращает массив изменений по выбранным полям.

#### `createAuditLog({ ..., save })`

Создаёт запись аудита через переданную функцию `save`. Если изменений нет — возвращает `null`.

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

**Продакшен-пример**:

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

### 13) Seed-функции

#### `createSeedFunctions({ cache, retryDelayMs? })`

Возвращает методы:

- `checkDatabaseIsConnected()` — проверяет состояние БД через кэш
- `setSeedData(SeedModel, arr)` — добавляет seed-данные после подтверждения подключения

```ts
import { createSeedFunctions, createCacheService } from '@rshval/back-kit';

const cache = createCacheService();
const { setSeedData } = createSeedFunctions({ cache });

// await setSeedData(UserModel, [{ name: 'Admin' }])
```

**Продакшен-пример**:

```ts
export const { checkDatabaseIsConnected, setSeedData } = createSeedFunctions({
  cache,
});
```

---

### 14) API-клиент

#### `createApiService({ userAgent, logger? })`

Возвращает HTTP-клиент с методами:

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

**Продакшен-пример**:

```ts
const apiService = createApiService({
  userAgent: config.api.userAgent,
  logger,
});

export const { get, getXml, del, post, put } = apiService;
```

Также экспортируется тип токена:

```ts
import type { Token } from '@rshval/back-kit';
```

---

### 15) Прочие экспортированные утилиты

#### `add(a, b)`

Возвращает сумму двух чисел.

#### `test2()`

Логирует `99` и возвращает `8`.

```ts
import { add, test2 } from '@rshval/back-kit';

add(2, 3); // 5
test2(); // 8
```

---

## Подготовка к публикации в npm

См. подробную инструкцию: [`docs/publishing.md`](docs/publishing.md).

Короткая формулировка для npm-описания:

- Набор фабрик сервисов (`create*`, `build*`) и готовых утилит/валидаторов.
- DI-friendly API: зависимости передаются снаружи (`logger`, `cache`, `save`, `findTemplate`).
- Важные поведенческие опции (`supportTtlInSet`, `passTtlToCacheSet`, `includeDelByPrefix`) стоит документировать рядом с примерами.

---

## Разработка (standalone)

```bash
npm install
npm run build
```

## Экспорты

- ESM: `dist/index.js`
- Типы: `dist/index.d.ts`
