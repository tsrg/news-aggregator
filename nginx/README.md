# Nginx для ivanovo.online

## Установка на сервер

1. Создать каталог для proxy_cache (указан в конфиге):
   ```bash
   sudo mkdir -p /var/cache/nginx/nuxt_static
   sudo chown -R www-data:www-data /var/cache/nginx/nuxt_static
   ```

2. Убедиться, что в `/etc/nginx/nginx.conf` внутри блока `http { ... }` НЕ задан `gzip off;` — иначе директивы gzip из конфига сайта не будут работать. Если `gzip on;` уже есть в `nginx.conf`, строки gzip в этом файле можно удалить (дублирование не страшно, но лишнее).

3. Скопировать конфиг:
   ```bash
   sudo cp ivanovo.online.conf /etc/nginx/sites-available/
   sudo ln -s /etc/nginx/sites-available/ivanovo.online.conf /etc/nginx/sites-enabled/
   ```

4. Проверить и перезагрузить:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

## HTTPS (Let's Encrypt)

На сервере должен быть каталог, откуда nginx отдаёт ACME-челлендж (иначе запрос уходит в Nuxt и даёт 500). В конфиге используется `root /var/www/html`.

```bash
sudo mkdir -p /var/www/html
sudo chown -R www-data:www-data /var/www/html   # или nginx:nginx — смотря пользователь nginx
```

Обнови конфиг на сервере из репозитория, затем:

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d ivanovo.online -d www.ivanovo.online -d admin.ivanovo.online
```

Certbot сам добавит `listen 443 ssl` и пути к сертификатам.

## DNS

- **ivanovo.online** и **www.ivanovo.online** → IP сервера  
- **admin.ivanovo.online** → тот же IP сервера  

Порты на сервере (из docker-compose): фронт `3001`, бэкенд `3002`, админка `5080`.

### Админка и CORS

В `ivanovo.online.conf` для `admin.ivanovo.online` проксируются `/api/`, `/uploads/` и `/socket.io/` на бэкенд (`3002`), чтобы запросы шли **с того же origin**, что и SPA админки. Собирайте образ админки с **`VITE_API_BASE_URL=https://admin.ivanovo.online`** (не `https://ivanovo.online`). После смены конфига nginx: `sudo nginx -t && sudo systemctl reload nginx`.

### WebSocket (Socket.IO) и HTTPS

Если обновления новостей в реальном времени не работают по **https://**, но работали по HTTP: certbot обычно добавляет отдельный `server { listen 443 ssl ... }` и **не копирует** `location /socket.io/`. Скопируйте блок с `ivanovo.online` (порт 80) из репозитория, вставьте в SSL-сервер для `ivanovo.online`, затем `sudo nginx -t && sudo systemctl reload nginx`.

В `http { ... }` в `nginx.conf` можно добавить (для корректного long-polling):

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

и в `location /socket.io/` заменить `Connection "upgrade"` на `Connection $connection_upgrade` — если без этого нестабильно.

### Картинки (MinIO / S3)

Публичные URL объектов не должны быть `http://localhost:9000/...`. В `.env` на сервере задайте **`S3_PUBLIC_BASE_URL=https://ivanovo.online/news-aggregator`** (путь совпадает с именем bucket). В конфиге есть **`location /news-aggregator/`** → прокси на MinIO (`127.0.0.1:9000`). После certbot продублируйте этот `location` в SSL-блоке для `ivanovo.online`, если certbot создал отдельный `server` для 443. Перезапустите backend, чтобы переменная подхватилась.
