interface Token {
  type: 'Token' | 'Bearer';
  key: string;
}

interface CreateApiServiceOptions {
  userAgent: string;
  logger?: Pick<Console, 'error'>;
}

interface SendOptions {
  method: string;
  path: string;
  data?: Record<string, unknown> | object;
  token?: Token;
  xml?: boolean;
  contentType?: string;
}

export const createApiService = ({
  userAgent,
  logger,
}: CreateApiServiceOptions) => {
  const send = async ({
    method,
    path,
    data,
    token,
    xml,
    contentType,
  }: SendOptions) => {
    const requestHeaders = new Headers();
    requestHeaders.set('User-Agent', userAgent);

    if (token) {
      requestHeaders.set('Authorization', ` ${token.type} ${token.key}`);
    }

    let body: string | URLSearchParams | undefined;

    if (data) {
      requestHeaders.set(
        'Content-Type',
        contentType ? contentType : 'application/json',
      );
      if (contentType === 'application/x-www-form-urlencoded') {
        body = new URLSearchParams(data as Record<string, string>);
      } else {
        body = JSON.stringify(data);
      }
    }

    const opts: RequestInit = {
      method,
      headers: requestHeaders,
      body,
    };

    try {
      const res = await fetch(path, opts);
      if (res.ok || res.status === 200 || res.status === 422) {
        const text = await res.text();
        if (xml) {
          return text;
        }

        return text ? JSON.parse(text) : {};
      }

      logger?.error('[' + new Date() + '] api error', res.status);
      return null;
    } catch (error) {
      logger?.error('[' + new Date() + '] error in API, options: ' + opts);
      logger?.error(error);

      if (error instanceof Error && error.name === 'AbortError') {
        console.log('request was aborted');
      }
    }
  };

  return {
    get: (path: string, token?: Token) => send({ method: 'GET', path, token }),
    getXml: (path: string, token?: Token) =>
      send({ method: 'GET', path, token, xml: true }),
    del: (path: string, token?: Token) =>
      send({ method: 'DELETE', path, token }),
    post: (
      path: string,
      data: Record<string, unknown>,
      token?: Token,
      xml?: boolean,
      contentType?: string,
    ) => send({ method: 'POST', path, data, token, xml, contentType }),
    put: (path: string, data: Record<string, unknown>, token: Token) =>
      send({ method: 'PUT', path, data, token }),
  };
};

export type { Token };
