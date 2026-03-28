export { createMailOptions, sendEmailWithConfig } from './email.js';
export type { MailOptionsBody } from './email.js';
export { createTokenByConfig, getBaseUrlByConfig } from './global.js';
export { createPinCode, getIp, translitUrl } from './helpers.js';
export {
  isEmpty,
  isValidCode,
  isValidEmail,
  isValidPhoneNumber,
  patternEmail,
  patternPassword,
} from './validation.js';
export { add, test2 } from './utils.js';
export {
  buildCreateToken,
  buildGetBaseUrl,
  buildSendEmail,
} from './site-helpers.js';
export { startMongoDatabase } from './database.js';
export { createCacheService } from './cache.js';
export { createCacheMiddleware } from './cache-middleware.js';
export { createLoggerService } from './logger.js';
export { createSocketClientService } from './socket-client.js';
export { createPaymasterService } from './paymaster.js';
export { createMailTemplateService } from './mail-template.js';

export { buildAuditChanges, createAuditLog } from './audit-log.js';

export { createSeedFunctions } from './seed.js';

export { createApiService } from './api.js';
export type { Token } from './api.js';

export {
  AuthHeaderBuilder,
  createCapacitorHttpAdapter,
  createFetchAdapter,
  createZodValidator,
  createZodValidatorFactory,
  fail,
  isFail,
  isOk,
  mapResult,
  normalizeHttpError,
  normalizeTransportError,
  ok,
  requestApi,
  runHttpContractsGuardCodemod,
  unwrapOr,
  httpContractsMigrationEslintPlugin,
  noResultOkRule,
} from './http-contracts.js';
export type {
  ApiError,
  ApiErrorKind,
  ApiResult,
  CreateZodValidatorOptions,
  CapacitorHttpClient,
  HttpAdapter,
  HttpRequest,
  HttpResponse,
  RequestWithParseOptions,
  RuntimeValidator,
  ValidationErrorDetails,
  ValidationIssue,
  HttpContractsGuardCodemodOptions,
  HttpContractsGuardCodemodResult,
} from './http-contracts.js';

export {
  clearDeprecatedAliasWarningsForTests,
  resolveDeprecatedAliasField,
} from './shared/compat/deprecated-alias.js';
