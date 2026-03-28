export interface DeprecatedAliasResolution {
  value: unknown;
  sourceKey: string | null;
  aliasUsed: string | null;
  isFromAlias: boolean;
  removalDate: string;
}

interface DeprecatedAliasOptions {
  source: Record<string, unknown>;
  canonicalKey: string;
  deprecatedAliases: string[];
  removalDate: string;
  warningMessage: string;
  warn?: (message: string) => void;
  env?: string;
}

const warnedAliasUsage = new Set<string>();

const hasOwnValue = (source: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(source, key) &&
  source[key] !== undefined &&
  source[key] !== null;

const shouldWarn = (env: string) => env === 'development';

export const clearDeprecatedAliasWarningsForTests = () => {
  warnedAliasUsage.clear();
};

export const resolveDeprecatedAliasField = ({
  source,
  canonicalKey,
  deprecatedAliases,
  removalDate,
  warningMessage,
  warn = console.warn,
  env = process.env.NODE_ENV || 'development',
}: DeprecatedAliasOptions): DeprecatedAliasResolution => {
  if (hasOwnValue(source, canonicalKey)) {
    return {
      value: source[canonicalKey],
      sourceKey: canonicalKey,
      aliasUsed: null,
      isFromAlias: false,
      removalDate,
    };
  }

  for (const alias of deprecatedAliases) {
    if (!hasOwnValue(source, alias)) continue;

    if (shouldWarn(env)) {
      const warnKey = `${canonicalKey}:${alias}:${removalDate}`;
      if (!warnedAliasUsage.has(warnKey)) {
        warnedAliasUsage.add(warnKey);
        warn(
          `${warningMessage} Deprecated alias "${alias}" is supported until ${removalDate}. Use "${canonicalKey}" instead.`,
        );
      }
    }

    return {
      value: source[alias],
      sourceKey: alias,
      aliasUsed: alias,
      isFromAlias: true,
      removalDate,
    };
  }

  return {
    value: undefined,
    sourceKey: null,
    aliasUsed: null,
    isFromAlias: false,
    removalDate,
  };
};
