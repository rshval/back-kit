type RuleContext = {
  sourceCode?: { getText(node: unknown): string };
  getSourceCode?: () => { getText(node: unknown): string };
  report(descriptor: {
    node: unknown;
    messageId: 'preferIsOk' | 'preferIsFail';
    fix: (fixer: {
      replaceText(node: unknown, text: string): unknown;
    }) => unknown;
  }): void;
};

type RuleNode = {
  type: string;
  computed?: boolean;
  property?: { type: string; name?: string };
  object?: unknown;
  parent?: RuleNode;
  argument?: unknown;
};

const resolveSourceCode = (context: RuleContext) => {
  if (context.sourceCode) {
    return context.sourceCode;
  }

  if (context.getSourceCode) {
    return context.getSourceCode();
  }

  throw new Error('ESLint SourceCode is not available.');
};

const isResultOkMemberExpression = (node: RuleNode): boolean =>
  node.type === 'MemberExpression' &&
  node.computed === false &&
  node.property?.type === 'Identifier' &&
  node.property.name === 'ok';

const isNegatedByUnaryBang = (node: RuleNode): boolean =>
  node.parent?.type === 'UnaryExpression' && node.parent.argument === node;

export const noResultOkRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Migrate ApiResult checks from result.ok / !result.ok to isOk(result) / isFail(result).',
      recommended: true,
    },
    fixable: 'code',
    messages: {
      preferIsOk: 'Use isOk(result) instead of result.ok.',
      preferIsFail: 'Use isFail(result) instead of !result.ok.',
    },
    schema: [],
  },
  create(context: RuleContext) {
    const sourceCode = resolveSourceCode(context);

    return {
      MemberExpression(node: RuleNode) {
        if (!isResultOkMemberExpression(node)) {
          return;
        }

        const objectText = sourceCode.getText(node.object);

        if (!objectText) {
          return;
        }

        if (isNegatedByUnaryBang(node) && node.parent) {
          context.report({
            node: node.parent,
            messageId: 'preferIsFail',
            fix: (fixer) =>
              fixer.replaceText(
                node.parent as unknown,
                `isFail(${objectText})`,
              ),
          });
          return;
        }

        context.report({
          node,
          messageId: 'preferIsOk',
          fix: (fixer) =>
            fixer.replaceText(node as unknown, `isOk(${objectText})`),
        });
      },
    };
  },
} as const;

export const httpContractsMigrationEslintPlugin = {
  rules: {
    'no-result-ok': noResultOkRule,
  },
} as const;
