const normalizeValue = (value: unknown) =>
  value === undefined || value === null ? '' : String(value);
const tokenPattern = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;

const resolveValue = (ctx: Record<string, unknown>, path: string) => {
  const chunks = path.split('.');
  let current: unknown = ctx;

  for (const chunk of chunks) {
    if (!current || typeof current !== 'object') return '';
    current = (current as Record<string, unknown>)[chunk];
  }

  return normalizeValue(current);
};

const render = (template: string, context: Record<string, unknown>) =>
  normalizeValue(template).replace(tokenPattern, (_, path: string) =>
    resolveValue(context, path),
  );

interface MailTemplateEntity {
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
}

interface CreateMailTemplateServiceOptions {
  findTemplate: (args: {
    key: string;
  }) => Promise<(MailTemplateEntity & { isActive?: boolean }) | null>;
  sendEmail: (to: string, subject: string, text: string) => Promise<unknown>;
}

export const createMailTemplateService = ({
  findTemplate,
  sendEmail,
}: CreateMailTemplateServiceOptions) => {
  return {
    extractVariables(template: string) {
      const vars = new Set<string>();

      for (const match of normalizeValue(template).matchAll(tokenPattern)) {
        if (match?.[1]) vars.add(String(match[1]));
      }

      return Array.from(vars.values()).sort();
    },

    renderTemplate(
      template: { subject: string; bodyHtml?: string; bodyText?: string },
      context = {},
    ) {
      const subject = render(template.subject, context);
      const bodyHtml = render(template.bodyHtml || '', context);
      const bodyText = render(template.bodyText || '', context);

      return { subject, bodyHtml, bodyText };
    },

    async sendByKey({
      key,
      to,
      context,
    }: {
      key: string;
      to: string;
      context?: Record<string, unknown>;
    }) {
      const template = await findTemplate({ key });

      if (!template || !to || template.isActive === false) {
        return {
          success: false,
          reason: 'template_or_recipient_missing',
        } as const;
      }

      const rendered = this.renderTemplate(
        {
          subject: template.subject,
          bodyHtml: template.bodyHtml,
          bodyText: template.bodyText,
        },
        context || {},
      );

      const text = rendered.bodyText || rendered.bodyHtml || '';
      if (!text.trim())
        return { success: false, reason: 'empty_template' } as const;

      await sendEmail(to, rendered.subject, text);
      return { success: true } as const;
    },
  };
};
