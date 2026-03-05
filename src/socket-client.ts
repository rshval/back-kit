import chalk from 'chalk';
import delay from 'delay';
import ora, { type Ora } from 'ora';
import { io, type Socket } from 'socket.io-client';

interface LoggerLike {
  debug: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

interface CreateSocketClientServiceOptions {
  wsName: string;
  socketBase: string;
  logger: LoggerLike;
  runWorkers: () => void;
  socketClientInterval?: number;
  connectedTarget?: string;
}

interface SocketClientService {
  doSocketClient: () => any;
  getSocketClient: () => any;
}

export const createSocketClientService = ({
  wsName,
  socketBase,
  logger,
  runWorkers,
  socketClientInterval = 300,
  connectedTarget,
}: CreateSocketClientServiceOptions): SocketClientService => {
  let spinner: Ora;
  let spinnerVisible = false;
  let socketClient: Socket | undefined;

  const buildConnectedMessage = () => {
    const base = 'Websocket [ws] client connected';
    return connectedTarget ? `${base} to ${connectedTarget}` : base;
  };

  const doSocketClient = () => {
    setTimeout(() => {
      spinner = ora(chalk.gray(`Connect to ${wsName} [ws] server`)).start();
    }, 100);

    socketClient = io(socketBase, {
      secure: true,
      rejectUnauthorized: false,
      reconnectionDelayMax: 10000,
      withCredentials: true,
    });

    socketClient.on('connect', () => {
      const connectedMessage = buildConnectedMessage();
      logger.debug(`[${new Date()}] ${connectedMessage}`);

      setTimeout(() => {
        spinnerVisible = false;
        spinner.start(chalk.green(connectedMessage));
        spinner.succeed();
      }, 100);

      setInterval(() => {
        runWorkers();
      }, socketClientInterval);
    });

    socketClient.on('connect_error', async (err: any) => {
      if (err && err.context) {
        const context = err.context || {};
        const error = {
          status: context.status,
          statusText: context.statusText,
        };

        logger.error(
          `[${new Date()}] Websocket [ws] connection error:\n`,
          error,
        );
      }

      if (!spinnerVisible) {
        spinnerVisible = true;
        await delay(100);
        spinner.start(chalk.red('Websocket [ws] client reconnection...'));
      }
    });

    socketClient.on('disconnect', async () => {
      logger.debug(`[${new Date()}] Websocket [ws] client disconnect`);

      if (!spinnerVisible) {
        spinnerVisible = true;
        await delay(100);
        spinner.start(chalk.red('Websocket [ws] client reconnection...'));
      }
    });

    return socketClient;
  };

  const getSocketClient = () => socketClient;

  return {
    doSocketClient,
    getSocketClient,
  };
};
