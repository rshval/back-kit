import type { MailOptionsBody } from './email.js';
import { sendEmailWithConfig } from './email.js';
import { createTokenByConfig, getBaseUrlByConfig } from './global.js';

type AppConfig = Parameters<typeof getBaseUrlByConfig>[0];
type User = Parameters<typeof createTokenByConfig>[0]['user'];
type ExpiresIn = Parameters<typeof createTokenByConfig>[0]['expiresIn'];
type NodemailerConfig = Parameters<
  typeof sendEmailWithConfig
>[0]['nodemailerConfig'];

export const buildGetBaseUrl = (config: AppConfig) => {
  return (baseUrl?: string) => getBaseUrlByConfig(config, baseUrl);
};

export const buildCreateToken = (config: AppConfig) => {
  return ({ user, expiresIn }: { user: User; expiresIn: ExpiresIn }) => {
    return createTokenByConfig({ config, user, expiresIn });
  };
};

export const buildSendEmail = (nodemailerConfig: NodemailerConfig) => {
  return (to: MailOptionsBody | string, subject: string, text: string) => {
    return sendEmailWithConfig({
      nodemailerConfig,
      to,
      subject,
      text,
    });
  };
};
