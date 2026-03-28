# HTTP Contracts: structure and migration guide (`back-kit` -> `gislar`)

## 1. Module structure and responsibilities

`@rshval/back-kit/http-contracts` should be consumed as layered primitives:

### contracts
- `ApiResult<TData, TError>`
- `ApiSuccess<TData>`
- `ApiFailure<TError>`

Responsibility: keep one transport-agnostic success/failure envelope for API and Web consumers.

### errors
- `ApiError`
- `ApiErrorKind`
- `normalizeHttpError(...)`
- `normalizeTransportError(...)`

Responsibility: normalize runtime/transport/domain validation failures into one shared taxonomy (`transport | validation | domain | unknown`).

### guards
- `isOk(...)`
- `isFail(...)`

Responsibility: narrow result unions safely in application flows and avoid ad-hoc `ok` checks across codebase.

### mappers
- `mapResult(...)`
- `unwrapOr(...)`

Responsibility: keep result transformation and fallback behavior reusable and side-effect-free.

### adapters
- `createFetchAdapter(...)`
- `createCapacitorHttpAdapter(...)`
- `requestApi(...)`

Responsibility: isolate HTTP-transport specifics and produce shared `ApiResult` contracts.

### validators
- `createZodValidator(...)`
- `createZodValidatorFactory(...)`

Responsibility: centralize DTO runtime validation and eliminate duplicated schema wiring in downstream apps.

---

## 2. Migration: from local app contracts to `back-kit/http-contracts`

### Before (typical local duplication)
- local `Result<T>` / `ErrorDto` interfaces in API and Web repositories;
- local timeout/network parsing heuristics;
- local zod wrapping with custom `{ success, error }` result shape.

### After (target state)
- use shared `ApiResult<TData, TError>` in both API and Web call chains;
- use `normalizeTransportError` for timeout/abort/network code classification;
- use `createZodValidatorFactory` to share validator defaults and return `ApiResult` directly.

### Minimal migration steps
1. Replace local result/error type aliases with `ApiResult` and `ApiError`.
2. Replace ad-hoc checks with `isOk` / `isFail` guards.
3. Replace custom DTO wrappers with `createZodValidator` or factory-built validators.
4. Replace transport parsing code with `normalizeTransportError` and adapter `source`.
5. Update architecture docs to state that API + Web use one shared contract boundary.

---

## 3. `gislar` API-side integration example

```ts
import { createFetchAdapter, createZodValidatorFactory, isFail, requestApi } from '@rshval/back-kit/http-contracts';
import { z } from 'zod';

const http = createFetchAdapter();
const makeValidator = createZodValidatorFactory({
  code: 'DTO_INVALID',
  includeInputInErrorDetails: false,
});

const validateCreateUser = makeValidator(
  z.object({
    email: z.string().email(),
    name: z.string().min(2),
  }),
);

export async function createUser(payload: unknown) {
  const dto = validateCreateUser.validate(payload);

  if (isFail(dto)) {
    return dto;
  }

  return requestApi<{ id: string }>(http, {
    url: '/users',
    method: 'POST',
    body: dto.data,
    parseAs: 'json',
  });
}
```

---

## 4. `gislar` Web-side integration example

```ts
import {
  createFetchAdapter,
  isFail,
  mapResult,
  requestApi,
  unwrapOr,
} from '@rshval/back-kit/http-contracts';

const http = createFetchAdapter();

export async function getUserName() {
  const result = await requestApi<{ profile?: { name?: string } }>(http, {
    url: '/api/me',
    method: 'GET',
    parseAs: 'json',
  });

  if (isFail(result)) {
    return 'Guest';
  }

  return unwrapOr(mapResult(result, (data) => data?.profile?.name ?? 'Guest'), 'Guest');
}
```

---

## 5. `gislar` downstream migration checklist

- [ ] Remove local duplicated `result/error` contracts.
- [ ] Migrate all API/Web call-sites to `ApiResult` and guards.
- [ ] Standardize transport classification (`TIMEOUT` / `ABORTED` / `NETWORK_ERROR`) from shared helper.
- [ ] Move validator defaults to `createZodValidatorFactory` per boundary.
- [ ] Update README + architecture docs in `gislar` to reference shared `back-kit/http-contracts` boundary.

For prerelease verification flow, use: [`docs/gislar-prerelease-validation.md`](docs/gislar-prerelease-validation.md).
