# @mymaillil/back

Пакет серверных утилит для проектов mymaillil.

## Публикация как отдельного публичного пакета

1. В корне монорепозитория выполните:

   ```bash
   ./scripts/extract-mymaillil-back.sh
   ```

   По умолчанию будет создана соседняя папка `../mymaillil-back-public` с отдельным git-репозиторием и историей коммитов пакета.

2. Перейдите в новый репозиторий и подключите удалённый origin:

   ```bash
   cd ../mymaillil-back-public
   git remote remove origin
   git remote add origin https://github.com/rshval/back-kit.git
   git push -u origin main
   ```

3. Опубликуйте пакет в npm:

   ```bash
   npm publish --access public
   ```

## Разработка (standalone)

```bash
npm install
npm run build
```

## Экспорты

- ESM: `dist/index.js`
- Типы: `dist/index.d.ts`
