# `gislar` prerelease validation plan for `@rshval/back-kit/http-contracts`

## Goal
Validate that `gislar` API and Web consume the same `http-contracts` semantics before final release.

## Scope
- API-side: DTO validation + non-2xx mapping + transport mapping.
- Web-side: fetch transport mapping + result guards/mappers.
- Shared acceptance: same taxonomy and stable transport codes.

## Expected shared invariants
1. `ApiError.kind` is one of: `transport | validation | domain | unknown`.
2. Transport failures map to stable codes: `TIMEOUT`, `ABORTED`, `NETWORK_ERROR`.
3. `isOk` / `isFail` guards are the only result discriminators at call sites.
4. DTO runtime validation returns `kind: 'validation'` with structured `issues`.

## Validation matrix

### A) API checks
- [ ] Invalid request DTO -> `kind=validation`, `code=DTO_INVALID` (or project-specific).
- [ ] API non-2xx (`409`, `422`) -> `kind=transport`, `source=http`, status preserved.
- [ ] Timeout path -> `kind=transport`, `code=TIMEOUT`.

### B) Web checks
- [ ] Browser/network disconnect (`fetch` failure) -> `kind=transport`, `source=fetch`, `code=NETWORK_ERROR`.
- [ ] Abort via `AbortController` -> `kind=transport`, `code=ABORTED`.
- [ ] UI fallback flow uses `isFail` + `unwrapOr` (without local duplicate result wrappers).

### C) Cross-layer parity
- [ ] API and Web docs reference the same shared contract boundary (`back-kit/http-contracts`).
- [ ] No local duplicated result/error contracts remain in `gislar` codebase.

## Recommended execution prompt (for `gislar` repo)

> Install latest prerelease of `@rshval/back-kit`, migrate API/Web call-sites to shared `http-contracts` primitives (`ApiResult`, `isOk`, `isFail`, `mapResult`, `unwrapOr`, `normalizeTransportError`, `createZodValidatorFactory`), run API and Web smoke tests, and produce a report against the validation matrix in `docs/gislar-prerelease-validation.md`.

## Exit criteria for final release
- All matrix checks pass on `gislar` API + Web.
- Migration checklist in `docs/http-contracts-migration-guide.md` is fully checked.
- Release notes include links to migration guide and validation report.
