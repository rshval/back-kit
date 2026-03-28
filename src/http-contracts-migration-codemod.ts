export interface HttpContractsGuardCodemodOptions {
  importPath?: string;
}

export interface HttpContractsGuardCodemodResult {
  code: string;
  changed: boolean;
  replacements: number;
}

const DEFAULT_IMPORT_PATH = '@rshval/back-kit/http-contracts';

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isIdentifierBoundary = (char: string | undefined): boolean => {
  if (!char) {
    return true;
  }

  return !/[A-Za-z0-9_$]/.test(char);
};

const findNextNonWhitespaceChar = (
  source: string,
  start: number,
): { char?: string; index: number } => {
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (!char) {
      continue;
    }

    if (!/\s/.test(char)) {
      return { char, index };
    }
  }

  return { char: undefined, index: source.length };
};

const findPrevNonWhitespaceChar = (
  source: string,
  start: number,
): { char?: string; index: number } => {
  for (let index = start; index >= 0; index -= 1) {
    const char = source[index];

    if (!char) {
      continue;
    }

    if (!/\s/.test(char)) {
      return { char, index };
    }
  }

  return { char: undefined, index: -1 };
};

const replaceNegatedOkChecks = (
  source: string,
): { code: string; count: number } => {
  const pattern =
    /!\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\[[^\]\n]+\])*)\s*\.ok\b/g;

  let count = 0;

  const code = source.replace(
    pattern,
    (full, expression: string, offset: number) => {
      const before = source[offset - 1];

      if (!isIdentifierBoundary(before)) {
        return full;
      }

      const next = findNextNonWhitespaceChar(source, offset + full.length).char;

      if (next === '=' || next === ':') {
        return full;
      }

      count += 1;
      return `isFail(${expression})`;
    },
  );

  return { code, count };
};

const replacePositiveOkChecks = (
  source: string,
): { code: string; count: number } => {
  const pattern =
    /\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\[[^\]\n]+\])*)\s*\.ok\b/g;

  let count = 0;

  const code = source.replace(
    pattern,
    (full, expression: string, offset: number) => {
      const prev = findPrevNonWhitespaceChar(source, offset - 1).char;

      if (prev === '!') {
        return full;
      }

      const next = findNextNonWhitespaceChar(source, offset + full.length).char;

      if (next === '=' || next === ':') {
        return full;
      }

      count += 1;
      return `isOk(${expression})`;
    },
  );

  return { code, count };
};

const appendGuardImports = (
  source: string,
  importPath: string,
  needIsOk: boolean,
  needIsFail: boolean,
): string => {
  if (!needIsOk && !needIsFail) {
    return source;
  }

  const importPattern = new RegExp(
    `import\\s+([^;]+)\\s+from\\s+['\"]${escapeRegExp(importPath)}['\"];?`,
  );

  const match = source.match(importPattern);

  if (match && typeof match.index === 'number') {
    const statement = match[0];
    const spec = match[1] ?? '';

    const named = spec.match(/\{([^}]*)\}/);

    if (!named) {
      return source;
    }

    const namedImports = named[1] ?? '';

    const names = namedImports
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (needIsOk && !names.includes('isOk')) {
      names.push('isOk');
    }

    if (needIsFail && !names.includes('isFail')) {
      names.push('isFail');
    }

    names.sort();

    const nextStatement = statement.replace(
      named[0],
      `{ ${names.join(', ')} }`,
    );

    return `${source.slice(0, match.index)}${nextStatement}${source.slice(match.index + statement.length)}`;
  }

  const imports = [needIsFail ? 'isFail' : null, needIsOk ? 'isOk' : null]
    .filter((value): value is string => Boolean(value))
    .sort();

  return `import { ${imports.join(', ')} } from '${importPath}';\n${source}`;
};

export const runHttpContractsGuardCodemod = (
  source: string,
  options: HttpContractsGuardCodemodOptions = {},
): HttpContractsGuardCodemodResult => {
  const importPath = options.importPath ?? DEFAULT_IMPORT_PATH;

  const negated = replaceNegatedOkChecks(source);
  const positive = replacePositiveOkChecks(negated.code);

  const replacements = negated.count + positive.count;

  if (!replacements) {
    return {
      code: source,
      changed: false,
      replacements: 0,
    };
  }

  const code = appendGuardImports(
    positive.code,
    importPath,
    positive.count > 0,
    negated.count > 0,
  );

  return {
    code,
    changed: true,
    replacements,
  };
};
