# Compatibility notes for dependent repositories (pre-migration safety)

This document guarantees minor-level compatibility for repositories that have not migrated yet.

## What remains backward-compatible

1. `requestApi(...)` still returns the same discriminated runtime shape:
   - success: `{ ok: true, status, headers, data }`
   - failure: `{ ok: false, status, headers?, error }`
2. Existing consumers that only check `result.ok` continue to work.
3. `HttpAdapter` still only requires `request(...)`; `source` is optional.
4. `ApiError.kind` is treated as optional for legacy manually-constructed errors.

## New fields are additive

- `ApiError.kind`
- normalized transport `error.code` values (`TIMEOUT`, `ABORTED`, `NETWORK_ERROR`)
- zod validator helpers (`createZodValidator`, `createZodValidatorFactory`)

These additions do not require immediate migration in downstream repositories.

## Recommended migration order (safe rollout)

1. Upgrade dependency to latest `back-kit` without changing call-sites.
2. Run smoke tests in each repository.
3. Migrate result/error wrappers to shared helpers incrementally.
4. Migrate DTO validation to shared validator factory.
5. Remove local duplicated contracts after parity checks pass.
