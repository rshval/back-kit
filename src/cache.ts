import { LRUCache } from 'lru-cache';

type CacheRecord = Record<string, unknown>;
type CompareValue = '<';

interface CreateCacheServiceOptions {
  max?: number;
  maxSize?: number;
  ttl?: number;
  supportTtlInSet?: boolean;
  exposeEntries?: boolean;
  exposeValues?: boolean;
}

interface CacheService {
  get: (key: string) => Promise<any>;
  delete: (key: string) => Promise<boolean>;
  set: (
    key: string,
    data: CacheRecord | CacheRecord[] | null,
    compareKey?: string,
    compareValue?: CompareValue,
    ttlMs?: number,
  ) => Promise<any>;
  getId: (val: object | string) => string;
  keys: () => IterableIterator<string>;
  clear: () => void;
  entries?: () => IterableIterator<[string, any]>;
  values?: () => IterableIterator<any>;
  readonly size: number;
}

export const createCacheService = ({
  max = 500 * 15,
  maxSize = 5000 * 15,
  ttl = 1000 * 60 * 60 * 24 * 7,
  supportTtlInSet = false,
  exposeEntries = false,
  exposeValues = false,
}: CreateCacheServiceOptions = {}): CacheService => {
  const lruCache = new LRUCache<string, any>({
    max,
    maxSize,
    sizeCalculation: () => 1,
    ttl,
    allowStale: false,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
  });

  const cache: CacheService = {
    get: async (key: string) => {
      return lruCache.get(key);
    },
    delete: async (key: string) => {
      return lruCache.delete(key);
    },
    set: async (
      key: string,
      data: CacheRecord | CacheRecord[] | null,
      compareKey?: string,
      compareValue?: CompareValue,
      ttlMs?: number,
    ) => {
      let cacheData = (lruCache.get(key) as CacheRecord[]) || [];
      let incorrectObj = false;
      const ttlOptions =
        supportTtlInSet && ttlMs && ttlMs > 0 ? { ttl: ttlMs } : undefined;

      if (data === null) {
        lruCache.set(key, data, ttlOptions);
        return lruCache.get(key);
      }

      if (Array.isArray(data)) {
        cacheData = [...data];
      } else if (typeof data === 'object') {
        let dataIsCached = false;

        cacheData.forEach((element, index) => {
          if (element.s === data.s) {
            if (compareKey && compareValue === '<') {
              incorrectObj =
                (element[compareKey] as number) < (data[compareKey] as number);
            }

            cacheData[index] = data;
            dataIsCached = true;
          }
        });

        if (!dataIsCached) {
          cacheData = [...cacheData, data];
        }
      }

      if (!incorrectObj && cacheData) {
        lruCache.set(key, cacheData, ttlOptions);
      }

      return lruCache.get(key);
    },
    getId: (val: object | string) => {
      if (typeof val === 'object') {
        return Object.entries(val)
          .map(([cacheKey, value]) => {
            return cacheKey + '_' + value + ';';
          })
          .join('')
          .toLowerCase();
      }

      return val.toLowerCase();
    },
    keys: () => lruCache.keys(),
    clear: () => lruCache.clear(),
    get size() {
      return lruCache.size;
    },
  };

  if (exposeEntries) {
    cache.entries = () => lruCache.entries();
  }

  if (exposeValues) {
    cache.values = () => lruCache.values();
  }

  return cache;
};
