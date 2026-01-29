# Telegram-бот CrystalBudget: почему не реагирует и как починить

## Ошибка «telegram_link_code column not found»

Если в приложении появляется ошибка вида **Could not find the 'telegram_link_code' column of 'profiles' in the schema cache**, в базе Supabase ещё нет колонок для Telegram.

**Что сделать:**

1. Откройте **Supabase Dashboard** → ваш проект → **SQL Editor**.
2. Выполните скрипт из файла `supabase/scripts/add-telegram-profile-columns.sql` (или команду ниже).
3. Обновите страницу приложения.

Либо примените все миграции из репозитория: в корне проекта выполните `supabase db push` (нужен установленный Supabase CLI и привязка к проекту).

---

## Почему бот не реагирует

Telegram отправляет обновления (сообщения) боту только на **вебхук** — URL, который вы один раз сообщаете Telegram. Если вебхук не установлен, Telegram никуда не шлёт сообщения, и бот «молчит».

Нужно один раз вызвать API Telegram и указать URL вашей Supabase-функции `telegram-bot`.

---

## Что нужно заранее

1. **Токен бота** — от [@BotFather](https://t.me/BotFather): команда `/newbot` или `/token`, сохраните значение `TELEGRAM_BOT_TOKEN`.
2. **Функция задеплоена** — в Supabase задеплоена Edge Function `telegram-bot`.
3. **Секреты в Supabase** — в настройках проекта: **Edge Functions → Secrets** задан `TELEGRAM_BOT_TOKEN` (и при необходимости остальные переменные).

---

## 1. URL функции

Формат:

```
https://<PROJECT_REF>.supabase.co/functions/v1/telegram-bot
```

`<PROJECT_REF>` — это ID вашего проекта в Supabase (например из `.env`: `VITE_SUPABASE_PROJECT_ID` или домен из `VITE_SUPABASE_URL`).

Пример: если `VITE_SUPABASE_URL=https://wsuqpdunvytwctsgzgfr.supabase.co`, то URL вебхука:

```
https://wsuqpdunvytwctsgzgfr.supabase.co/functions/v1/telegram-bot
```

---

## 2. Установка вебхука

Подставьте свой токен бота и URL функции и выполните (один раз):

```bash
# Замените YOUR_BOT_TOKEN и YOUR_FUNCTION_URL на свои значения
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=YOUR_FUNCTION_URL"
```

Пример:

```bash
curl "https://api.telegram.org/bot123456:ABC-DEF/setWebhook?url=https://wsuqpdunvytwctsgzgfr.supabase.co/functions/v1/telegram-bot"
```

В ответе должно быть: `{"ok":true,"result":true,"description":"Webhook was set"}`.

---

## 3. Проверка вебхука

Убедиться, что вебхук указан правильно:

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

В ответе в поле `url` должен быть ваш URL функции.

---

## 4. Доступ к функции без авторизации

Supabase Edge Functions по умолчанию могут требовать заголовок `Authorization`. Telegram при отправке вебхука этот заголовок не присылает.

Нужно, чтобы функция `telegram-bot` была доступна по URL **без** авторизации:

- В Supabase: **Authentication → Settings** или настройки проекта: для Edge Functions можно разрешить вызов без JWT (если такая опция есть в вашей версии).
- Либо в **Database → Roles** / настройках RLS и политиках не блокировать анонимные запросы к функции (если доступ к функции идёт через anon key).

Если функция отвечает 401/403 на запросы без заголовка — вебхук не заработает. В логах функции (Supabase Dashboard → Edge Functions → telegram-bot → Logs) можно посмотреть входящие запросы и ошибки.

---

## 5. Сброс вебхука (если нужно сменить URL)

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/deleteWebhook"
```

После этого снова вызовите `setWebhook` с новым URL.

---

## Краткий чеклист

- [ ] Бот создан в @BotFather, токен сохранён.
- [ ] В Supabase в секретах задан `TELEGRAM_BOT_TOKEN`.
- [ ] Функция `telegram-bot` задеплоена.
- [ ] Вызван `setWebhook` с URL вида `https://<project>.supabase.co/functions/v1/telegram-bot`.
- [ ] Функция доступна по этому URL без обязательной авторизации (или настроена под анонимный вызов).
- [ ] В Telegram отправлено боту сообщение `/start` — бот должен ответить.

После выполнения этих шагов бот начнёт получать обновления и реагировать на команды.
