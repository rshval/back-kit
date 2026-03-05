import CyrillicToTranslit from 'cyrillic-to-translit-js';

export const createPinCode = (min = 10000, max = 99990) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const getIp = async (req: {
  ip?: string;
  connection?: { remoteAddress?: string; socket?: { remoteAddress?: string } };
  socket?: { remoteAddress?: string };
  headers?: Record<string, string | string[] | undefined>;
}) => {
  return (
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection?.socket?.remoteAddress ||
    req.headers?.['x-forwarded-for']
  );
};

const cyrillicToTranslit = CyrillicToTranslit();

export const translitUrl = (str: string | null | undefined) => {
  if (str) {
    return cyrillicToTranslit.transform(str, '-').toLowerCase();
  }

  return 'str';
};
