# Nginx для ivanovo.online

## Установка на сервер

1. Скопировать конфиг:
   ```bash
   sudo cp ivanovo.online.conf /etc/nginx/sites-available/
   sudo ln -s /etc/nginx/sites-available/ivanovo.online.conf /etc/nginx/sites-enabled/
   ```

2. Проверить и перезагрузить:
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
