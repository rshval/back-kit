import { describe, expect, it } from 'vitest';

import { noResultOkRule } from './http-contracts-eslint-rule.js';

describe('noResultOkRule', () => {
  it('suggests isOk for result.ok', () => {
    const reports: Array<{ messageId: string; replacement: string }> = [];

    const visitors = noResultOkRule.create({
      sourceCode: {
        getText(node) {
          return (node as { text?: string }).text ?? '';
        },
      },
      report({ messageId, fix, node }) {
        const replacement = String(
          fix({ replaceText: (_target, text) => text }) ??
            (node as { text?: string }).text,
        );
        reports.push({ messageId, replacement });
      },
    });

    const node = {
      type: 'MemberExpression',
      computed: false,
      property: { type: 'Identifier', name: 'ok' },
      object: { text: 'result' },
    };

    visitors.MemberExpression(node);

    expect(reports).toEqual([
      { messageId: 'preferIsOk', replacement: 'isOk(result)' },
    ]);
  });

  it('suggests isFail for !result.ok', () => {
    const reports: Array<{ messageId: string; replacement: string }> = [];

    const visitors = noResultOkRule.create({
      sourceCode: {
        getText(node) {
          return (node as { text?: string }).text ?? '';
        },
      },
      report({ messageId, fix, node }) {
        const replacement = String(
          fix({ replaceText: (_target, text) => text }) ??
            (node as { text?: string }).text,
        );
        reports.push({ messageId, replacement });
      },
    });

    const member = {
      type: 'MemberExpression',
      computed: false,
      property: { type: 'Identifier', name: 'ok' },
      object: { text: 'result' },
    } as {
      type: string;
      computed: boolean;
      property: { type: string; name: string };
      object: { text: string };
      parent?: unknown;
    };

    const unary = {
      type: 'UnaryExpression',
      operator: '!',
      argument: member,
      text: '!result.ok',
    };

    member.parent = unary;

    visitors.MemberExpression(member);

    expect(reports).toEqual([
      { messageId: 'preferIsFail', replacement: 'isFail(result)' },
    ]);
  });
});
