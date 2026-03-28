# Release Task: strengthen `http-contracts` for `gislar` integration (web + api)

## Context
`gislar` currently keeps part of HTTP result/error handling and DTO validation at the app level. This creates duplicated domain-adjacent types and inconsistent error/validation behavior between API and Web layers.

The task below formalizes a shared contract layer in `back-kit` so `gislar` can consume one unified HTTP contract API without local duplication.

## Goal
Deliver a stable, versioned contract surface in `back-kit/http-contracts` that unifies:
- `ApiResult` semantics;
- error taxonomy and normalization;
- runtime validation adapters;
- transport integration patterns for fetch-like clients.

Target outcome: `gislar` (api + web) uses shared contract primitives from `back-kit` with no duplicate local `result/error` models.

## Scope

### 1) Strengthen `http-contracts` core API
- Standardize `ApiResult<TData, TError>` shape and semantics.
- Freeze unified error taxonomy:
  - `transport`
  - `validation`
  - `domain`
  - `unknown`
- Provide typed helpers:
  - `ok(...)`
  - `fail(...)`
  - `isOk(...)`
  - `isFail(...)`
  - `mapResult(...)`
  - `unwrapOr(...)`
- Ensure helpers are side-effect free and composable in both web and api runtime.

### 2) Runtime validation + type safety
- Add zod-based adapters for request/response DTO validation.
- Introduce validator factories to avoid schema wiring duplication in apps.
- Define contract versioning rules:
  - what is allowed in `minor`;
  - what requires `major`;
  - deprecation policy and transition window.

### 3) Transport adapters
- Provide adapters for typical fetch/http-client flows.
- Normalize timeout/abort/network failure mapping into taxonomy.
- Preserve compatibility with current `gislar` integration pattern (no hidden minor-level breaking changes).

### 4) Documentation and usage structure
- Document package structure and responsibilities:
  - `contracts`
  - `errors`
  - `guards`
  - `mappers`
  - `adapters`
  - `validators`
- Add migration guide:
  - **"from local app types to back-kit contracts"**
- Add explicit integration examples for `gislar`:
  - API-side example
  - Web-side example

### 5) Ecosystem follow-up for `gislar`
Prepare migration checklist for downstream repo:
1. Remove local duplicated result/error types.
2. Migrate call sites to `back-kit` helpers and guards.
3. Update `README` and architecture docs after migration.

## Acceptance Criteria
- Public `http-contracts` API covers success/fail/guard/map scenarios.
- Integration examples exist for both web and api usage.
- Documentation contains explicit module structure and migration notes.
- `gislar` migration checklist is clear and has no hidden breaking changes.

## Non-goals
- Rewriting `gislar` domain entities in `back-kit`.
- Introducing framework-specific transport assumptions.
- Changing existing domain business rules in consumer apps.

## Deliverables
1. Updated `http-contracts` public API exports and typings.
2. Zod-based validator adapter layer + factories.
3. Transport adapter normalization for timeout/abort/network paths.
4. Documentation set:
   - structure overview
   - migration guide
   - `gislar` web/api examples
5. `gislar` follow-up migration checklist.

## Implementation notes (for maintainers)
- Keep contract layer domain-agnostic: DTO contracts only, no app domain models.
- Prefer additive evolution for minor releases.
- If behavior must change, ship explicit migration notes and compatibility helper wrappers.
- Ensure helper naming and signatures are stable enough for cross-repo reuse.

## Suggested rollout plan
1. Introduce additive API and docs in `back-kit`.
2. Publish prerelease tag and validate in `gislar` API.
3. Validate in `gislar` Web (same contracts, same taxonomy).
4. Finalize release with migration notes.

## Suggested follow-up prompt for `gislar` repository
Use this after `back-kit` release is published:

> Migrate `gislar` (api + web) to `back-kit/http-contracts` latest release. Remove local duplicated result/error types, switch HTTP flows to shared helpers (`ok/fail/isOk/isFail/mapResult/unwrapOr`), wire zod validators through `back-kit` factories, and update README + architecture docs with the new contract layer.
