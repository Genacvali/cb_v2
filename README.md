## CrystalBudget

Приложение для умного распределения доходов по категориям расходов.

### Технологии

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

### Локальный запуск

```sh
npm install
npm run dev
```

По умолчанию приложение поднимается на `http://localhost:8080`.

### Сборка

```sh
npm run build
```

### Telegram-бот и вход через Telegram

**Вход через Telegram (кнопка «Войти через Telegram»):**

1. В **@BotFather** создайте бота и запомните его **username** (без @), например `CrystalBudget_bot`.
2. Привяжите домен сайта: в @BotFather отправьте `/setdomain`, выберите бота, укажите домен (например `crystalbudget.net` без https://).
3. В проекте задайте переменную окружения (в `.env`), если имя бота другое:
   ```env
   VITE_TELEGRAM_BOT_USERNAME=CrystalBudget_bot
   ```
   По умолчанию используется `CrystalBudget_bot`.
4. Ошибка **«Username invalid»** обычно значит: неверное имя бота в `VITE_TELEGRAM_BOT_USERNAME` или домен не привязан в @BotFather (`/setdomain`).

**Если бот не реагирует на сообщения** — установите вебхук (один раз):

```sh
./scripts/set-telegram-webhook.sh YOUR_BOT_TOKEN https://YOUR_PROJECT.supabase.co
```

Подробно: [docs/TELEGRAM_BOT.md](docs/TELEGRAM_BOT.md).
