import chalk from 'chalk';
import delay from 'delay';
import ora from 'ora';
import type { HydratedDocument, Model } from 'mongoose';

interface CacheServiceLike {
  getId: (value: object | string) => string;
  get: (key: string) => Promise<any>;
}

interface CreateSeedFunctionsOptions {
  cache: CacheServiceLike;
  retryDelayMs?: number;
}

export const createSeedFunctions = ({
  cache,
  retryDelayMs = 1000,
}: CreateSeedFunctionsOptions) => {
  const checkDatabaseIsConnected = async () => {
    const cacheIdDatabase = cache.getId({
      service: 'database',
    });

    let cachedDatabaseData: any;

    if (cacheIdDatabase) {
      cachedDatabaseData = await cache.get(cacheIdDatabase);
    }

    if (
      cachedDatabaseData &&
      cachedDatabaseData.length &&
      cachedDatabaseData[0].status === 'connected'
    ) {
      return true;
    }

    return false;
  };

  const setSeedData = async (
    SeedModel: typeof Model,
    arr: object[],
  ): Promise<void> => {
    const databaseIsConnected = await checkDatabaseIsConnected();

    if (databaseIsConnected) {
      const spinner = ora({
        text: chalk.gray('add seed data - ' + SeedModel.modelName),
        stream: process.stdout,
      }).start();

      type Doc = HydratedDocument<typeof SeedModel>;

      const arrs: Doc[] = [];
      let done2 = 0;

      for (let i = 0; i < arr.length; i++) {
        const obj: Doc = await new SeedModel(arr[i]);
        arrs.push(obj);

        if (++done2 === arr.length) {
          let done = 0;

          for (const item of arrs) {
            await item
              .save()
              .then(() => {
                if (++done === arrs.length) {
                  return done;
                }
              })
              .catch(() => {
                return null;
              });
          }
        }
      }

      spinner.start(chalk.green('seeds "' + SeedModel.modelName + '" added'));
      spinner.succeed();

      return;
    }

    await delay(retryDelayMs);

    return setSeedData(SeedModel, arr);
  };

  return {
    checkDatabaseIsConnected,
    setSeedData,
  };
};
