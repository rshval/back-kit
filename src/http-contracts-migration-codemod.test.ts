import { describe, expect, it } from 'vitest';

import { runHttpContractsGuardCodemod } from './http-contracts-migration-codemod.js';

describe('runHttpContractsGuardCodemod', () => {
  it('replaces result.ok and !result.ok with guard helpers and injects imports', () => {
    const source = `
const response = await apiCall();

if (!response.ok) {
  return response.error;
}

if (response.ok) {
  return response.data;
}
`;

    const migrated = runHttpContractsGuardCodemod(source);

    expect(migrated.changed).toBe(true);
    expect(migrated.replacements).toBe(2);
    expect(migrated.code).toContain(
      "import { isFail, isOk } from '@rshval/back-kit/http-contracts';",
    );
    expect(migrated.code).toContain('if (isFail(response))');
    expect(migrated.code).toContain('if (isOk(response))');
  });

  it('extends existing back-kit/http-contracts import instead of adding a new one', () => {
    const source = `
import { requestApi } from '@rshval/back-kit/http-contracts';

if (!result.ok) {
  throw result.error;
}
`;

    const migrated = runHttpContractsGuardCodemod(source);

    expect(migrated.code).toContain(
      "import { isFail, requestApi } from '@rshval/back-kit/http-contracts';",
    );
    expect(migrated.code).toContain('if (isFail(result))');
    expect(
      migrated.code.match(/@rshval\/back-kit\/http-contracts/g)?.length,
    ).toBe(1);
  });

  it('keeps code unchanged when there are no ok checks', () => {
    const source = `
import { requestApi } from '@rshval/back-kit/http-contracts';

const value = true;
`;

    const migrated = runHttpContractsGuardCodemod(source);

    expect(migrated.changed).toBe(false);
    expect(migrated.replacements).toBe(0);
    expect(migrated.code).toBe(source);
  });
});
