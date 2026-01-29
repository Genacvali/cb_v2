# Деплой CrystalBudget на сервер

## Как правильно раздавать сайт

После сборки (`npm run build`) нужно отдавать пользователям **только папку `dist/`**, а не корень проекта.

- **Корень проекта** содержит `index.html` с `<script src="/src/main.tsx">` — это для режима разработки. При раздаче корня браузер пытается загрузить файлы из `/node_modules/.vite/deps/`, получает 403 и приложение не работает.
- **Папка `dist/`** содержит собранный сайт: `index.html` подключает `/assets/index-xxxxx.js` и CSS. Никаких `node_modules` или `src` раздавать не нужно.

## Nginx

Укажите корнем сайта каталог **внутри** которого лежат файлы из `dist/` (то есть сам каталог `dist`):

```nginx
server {
    listen 80;
    server_name crystalbudget.net;
    root /path/to/cb_v2/dist;   # именно dist, не корень проекта
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Перезапустите nginx после изменений.

## Проверка

1. На сервере: `cd /path/to/cb_v2 && npm run build`
2. Убедитесь, что в `dist/index.html` есть ссылки на `/assets/index-....js` и `/assets/index-....css`, а не на `/src/main.tsx`
3. В конфиге веб-сервера `root` должен указывать на каталог `dist`

После этого запросы к `https://crystalbudget.net/` будут отдавать собранное приложение без обращений к `node_modules`.
