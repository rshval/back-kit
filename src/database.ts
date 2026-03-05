import chalk from 'chalk';
import delay from 'delay';
import mongoose from 'mongoose';
import ora, { type Ora } from 'ora';

type CacheStatus = 'error' | 'connected';

interface LoggerLike {
  debug: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
}

interface DatabaseConfig {
  name: string;
  connect?: string;
  params?: mongoose.ConnectOptions;
  platform?: string;
}

interface StartMongoDatabaseOptions {
  config: DatabaseConfig;
  logger: LoggerLike;
  setCacheStatus?: (status: CacheStatus) => void | Promise<void>;
  retryDelayMs?: number;
  startupDelayMs?: number;
  connectionLabel?: string;
}

let isStarted = false;

const buildConnectionSuffix = (
  config: DatabaseConfig,
  connectionLabel?: string,
) => {
  if (connectionLabel) {
    return ` [database ${connectionLabel}]`;
  }

  if (config.platform) {
    return ` [database ${config.platform}]`;
  }

  return ' [database]';
};

const createLogMessage = (suffix: string, message: string) =>
  `[${new Date().toISOString()}]${suffix} ${message}`;

const createSpinnerMessage = (
  config: DatabaseConfig,
  suffix: string,
  message: string,
) => `${config.name}${suffix} ${message}`;

export const startMongoDatabase = async ({
  config,
  logger,
  setCacheStatus,
  retryDelayMs = 1000,
  startupDelayMs = 100,
  connectionLabel,
}: StartMongoDatabaseOptions) => {
  const connectString = config.connect?.trim();

  if (!connectString) {
    throw new Error('Database connection string is not configured');
  }

  if (isStarted) {
    logger.warn?.(
      `[${new Date().toISOString()}] [database] already started, skip duplicate init`,
    );
    return;
  }

  isStarted = true;

  await delay(startupDelayMs);

  let spinnerVisible = false;
  let spinner: Ora;
  const suffix = buildConnectionSuffix(config, connectionLabel);
  const log = {
    debug: (message: string) => logger.debug(createLogMessage(suffix, message)),
    error: (message: string, err: unknown) =>
      logger.error(createLogMessage(suffix, `${message}:`), err),
  };

  const updateSpinner = (
    color: 'green' | 'cyan' | 'red',
    message: string,
    method: 'succeed' | 'fail' | 'start' = 'succeed',
  ) => {
    const spinnerMessage = createSpinnerMessage(config, suffix, message);

    spinner.start(chalk[color](spinnerMessage));

    if (method === 'succeed') {
      spinner.succeed();
      return;
    }

    if (method === 'fail') {
      spinner.fail();
      return;
    }
  };

  mongoose.Promise = global.Promise;
  mongoose.set('strictQuery', false);

  const connectDb = () => {
    spinner = ora(chalk.gray(`Connect to database ${config.name}`)).start();
    mongoose.connect(connectString, config.params).catch((err) => {
      log.error('connection error', err);
    });
  };

  const db = mongoose.connection;
  db.removeAllListeners('error');
  db.removeAllListeners('connected');
  db.removeAllListeners('open');
  db.removeAllListeners('reconnected');

  connectDb();

  db.on('error', async (err) => {
    updateSpinner('red', 'connection error', 'fail');
    log.error('connection error', err);
    await setCacheStatus?.('error');
    await delay(retryDelayMs);
    connectDb();
  });

  db.on('connected', async () => {
    await delay(startupDelayMs);
    await setCacheStatus?.('connected');
    log.debug('connected');
    spinnerVisible = false;
    updateSpinner('cyan', 'connected');
  });

  db.once('open', async () => {
    await delay(startupDelayMs);
    spinnerVisible = false;
    updateSpinner('green', 'connection opened');
    log.debug('connection opened');
  });

  db.on('reconnected', async () => {
    log.debug('reconnected');

    if (!spinnerVisible) {
      spinnerVisible = true;
      await delay(startupDelayMs);
      updateSpinner('cyan', 'reconnected');
    }
  });
};
