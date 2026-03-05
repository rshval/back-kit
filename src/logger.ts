import { Console } from 'console';
import fs from 'fs';
import path from 'path';

interface CreateLoggerServiceOptions {
  rootdir?: string;
}

const getRootdir = () => {
  const entrypoint = process.argv[1] || process.cwd();
  return path.dirname(entrypoint).replace('src', '');
};

export const createLoggerService = ({
  rootdir = getRootdir(),
}: CreateLoggerServiceOptions = {}) => {
  return (std: string) => {
    const logsDir = path.join(rootdir, 'logs', std);

    fs.mkdirSync(logsDir, { recursive: true });

    const output = fs.createWriteStream(path.join(logsDir, 'stdout.log'));
    const errorOutput = fs.createWriteStream(path.join(logsDir, 'stderr.log'));

    return new Console({ stdout: output, stderr: errorOutput });
  };
};
