# Публикация пакета в npm

## 1) Требования

- Node.js 18+
- npm 9+
- доступ к npm-аккаунту, имеющему право публиковать пакет `@rshval/back-kit`

## 2) Сборка и проверка содержимого публикации

```bash
npm install
npm run build
npm run pack:dry
```

`npm run pack:dry` показывает, какие файлы реально попадут в npm-пакет.

## 3) Логин в npm

```bash
npm login
```

Проверить текущего пользователя:

```bash
npm whoami
```

## 4) Публикация

1. Обновите версию:

```bash
npm version patch
# или minor / major
```

2. Опубликуйте пакет:

```bash
npm publish
```

> Пакет публикуется как `public` (см. `publishConfig.access`).

> Если при `npm publish` появляется ошибка `E403` с текстом
> `Two-factor authentication or granular access token with bypass 2fa enabled is required`,
> значит текущий токен не подходит для публикации.
>
> Варианты решения:
> - выполните `npm login --auth-type=web` и подтвердите OTP при публикации;
> - или создайте **granular access token** на npmjs.com с правами `read and write`
>   для пакета и включённым `bypass 2FA for publishing`, затем обновите токен локально
>   через `npm logout && npm login` (или настройкой в `.npmrc`).
