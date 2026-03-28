# HTTP Contracts Rollout Backlog (post-release-task)

## Context
Core implementation backlog from `docs/http-contracts-gislar-release-task.md` is closed. This file tracks the next rollout phase across dependent repositories.

## Tasks

1. ✅ Add API/Web parity integration checks in `back-kit` tests to protect shared taxonomy behavior.
2. ✅ Prepared prerelease validation matrix + execution prompt for `gislar` API/Web (`docs/gislar-prerelease-validation.md`).
3. ✅ Added explicit pre-migration compatibility notes for dependent repositories (`docs/http-contracts-compatibility.md`).
4. ⏳ Execute prerelease validation in `gislar` API and align endpoint error handling.
5. ⏳ Execute prerelease validation in `gislar` Web and align UI error handling.
6. ⏳ Publish final release notes with migration checklist references.

## Notes
- Keep shared contracts additive for minor releases.
- Any breaking taxonomy or discriminant changes require major version bump.
