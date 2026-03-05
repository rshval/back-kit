# @rshval/back-kit

Публичный npm-пакет `@rshval/back-kit` с серверными утилитами для Node.js/TypeScript проектов.

> Репозиторий используется для внутренних проектов автора. Любое использование третьими лицами выполняется на их страх и риск.

## Подготовка к публикации в npm

### 1) Требования

- Node.js 18+
- npm 9+
- доступ к npm-аккаунту, имеющему право публиковать пакет `@rshval/back-kit`

### 2) Сборка и проверка содержимого публикации

```bash
npm install
npm run build
npm run pack:dry
```

`npm run pack:dry` показывает, какие файлы реально попадут в npm-пакет.

### 3) Логин в npm

```bash
npm login
```

Проверить текущего пользователя:

```bash
npm whoami
```

### 4) Публикация

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

---

## Подключение пакета в проект

### Установка

```bash
npm i @rshval/back-kit
```

### Пример использования

```ts
import { isValidEmail } from '@rshval/back-kit'

const isEmailValid = isValidEmail('user@example.com')
console.log(isEmailValid)
```

> Пакет ESM-only (`"type": "module"`). Для CommonJS нужен динамический `import()`.

---

## Разработка (standalone)

```bash
npm install
npm run build
```

## Экспорты

- ESM: `dist/index.js`
- Типы: `dist/index.d.ts`
