interface CacheLike {
  getId: (val: object | string) => string;
  get: (key: string) => Promise<any>;
  set: (
    key: string,
    data: object | null,
    compareKey?: string,
    compareValue?: string,
    ttlMs?: number,
  ) => Promise<any>;
  delete: (key: string) => Promise<boolean>;
  entries?: () => IterableIterator<[string, any]>;
  keys: () => IterableIterator<string>;
  values?: () => IterableIterator<any>;
  size: number;
}

interface CreateCacheMiddlewareOptions {
  cache: CacheLike;
  passTtlToCacheSet?: boolean;
  includeDelByPrefix?: boolean;
}

export const createCacheMiddleware = ({
  cache,
  passTtlToCacheSet = false,
  includeDelByPrefix = false,
}: CreateCacheMiddlewareOptions) => {
  const get = async (id: string) => {
    const cacheId = cache.getId(id);

    try {
      let cachedData: any;

      if (cacheId) {
        cachedData = await cache.get(cacheId);
      }

      if (cachedData?.length) {
        if (cachedData[0].expires?.getTime() > new Date().getTime()) {
          return cachedData;
        }

        await cache.delete(cacheId);
        return null;
      }

      return null;
    } catch (error) {
      console.log('error', error);
      await cache.delete(cacheId);
      return null;
    }
  };

  const set = async (id: string, data: any, expDataTime: number) => {
    const cacheId = cache.getId(id);
    const expiresDateTime = new Date(Date.now() + expDataTime);
    const payload = { data, expires: expiresDateTime };

    if (passTtlToCacheSet) {
      await cache.set(cacheId, payload, undefined, undefined, expDataTime);
    } else {
      await cache.set(cacheId, payload);
    }

    return cache.get(cacheId);
  };

  const del = async (id: string) => {
    const cacheId = cache.getId(id);
    return cache.delete(cacheId);
  };

  const result = {
    get,
    set,
    del,
    entries: cache.entries,
    keys: cache.keys,
    values: cache.values,
    size: cache.size,
  } as {
    get: typeof get;
    set: typeof set;
    del: typeof del;
    delByPrefix?: (prefix: string) => Promise<number>;
    entries?: CacheLike['entries'];
    keys: CacheLike['keys'];
    values?: CacheLike['values'];
    size: number;
  };

  if (includeDelByPrefix) {
    result.delByPrefix = async (prefix: string) => {
      try {
        const p = prefix.toLowerCase();
        let count = 0;

        const iterator = cache.keys();
        for (let item = iterator.next(); !item.done; item = iterator.next()) {
          const key = item.value;
          if (typeof key === 'string' && key.startsWith(p)) {
            await cache.delete(key);
            count++;
          }
        }

        return count;
      } catch (error) {
        console.log('delByPrefix error:', error);
        return 0;
      }
    };
  }

  return result;
};
