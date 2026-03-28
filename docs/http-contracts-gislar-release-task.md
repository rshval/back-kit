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

### Completed
1. ✅ Strengthen `http-contracts` core API:
   - `ApiResult<TData, TError>` semantics standardized;
   - error taxonomy fixed (`transport`, `validation`, `domain`, `unknown`);
   - helpers added (`ok`, `fail`, `isOk`, `isFail`, `mapResult`, `unwrapOr`);
   - composition remains side-effect free for web/api runtimes.
2. ✅ Runtime validation + type safety:
   - zod-based runtime validators added for DTO validation;
   - validator factory support added to prevent schema wiring duplication;
   - versioning/deprecation policy documented below.
3. ✅ Transport adapters:
   - fetch/capacitor adapters expose transport source (`fetch` / `capacitor-http`);
   - transport failures are normalized with stable timeout/abort/network codes;
   - `requestApi` preserves compatibility while mapping thrown transport errors.
4. ✅ Documentation and usage structure:
   - module responsibility structure documented (`contracts/errors/guards/mappers/adapters/validators`);
   - migration guide added: `docs/http-contracts-migration-guide.md`;
   - `gislar` API/Web integration examples added.
5. ✅ Ecosystem follow-up for `gislar`:
   - downstream migration checklist added to migration guide.

### Contract versioning rules (`http-contracts`)
- **Minor allowed**:
  - new additive exports (helpers, adapters, validators);
  - additive optional fields in error details payloads;
  - backward-compatible docs/examples updates.
- **Major required**:
  - changing `ApiResult` discriminant semantics (`ok: true/false`);
  - removing or renaming public exports;
  - changing meaning of existing taxonomy values.
- **Deprecation policy**:
  - mark deprecated API in docs + changelog immediately;
  - keep compatibility wrappers for at least one minor release;
  - removal is allowed only in next major release.

## Backlog status
✅ Release task backlog is fully closed in this repository.
Next phase backlog: [`docs/http-contracts-rollout-backlog.md`](docs/http-contracts-rollout-backlog.md).

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
