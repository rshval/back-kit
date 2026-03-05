import jwt from 'jsonwebtoken';

interface ServerConfig {
  domain: string;
  port?: string | number;
}

interface JwtConfig {
  JWT_KEY?: string;
  JWT_KEY_NO_ENV?: string;
}

interface AppConfig {
  NODE_ENV?: string;
  server: ServerConfig;
  jwt: JwtConfig;
}

export const getBaseUrlByConfig = (config: AppConfig, baseUrl?: string) => {
  let url =
    '//' +
    config.server.domain +
    (config.NODE_ENV === 'development' ? ':' + config.server.port : '');

  if (baseUrl) {
    url = url + baseUrl;
  }

  return url;
};

export const createTokenByConfig = ({
  config,
  user,
  expiresIn,
}: {
  config: AppConfig;
  user: { _id: string };
  expiresIn: jwt.SignOptions['expiresIn'];
}) => {
  const jwtKey = config.jwt.JWT_KEY || config.jwt.JWT_KEY_NO_ENV;

  if (!jwtKey) {
    throw new Error('JWT key not configured');
  }

  return jwt.sign(user, jwtKey, {
    expiresIn,
  });
};
