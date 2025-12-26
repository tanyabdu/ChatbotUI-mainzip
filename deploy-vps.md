# Инструкция по развертыванию на VPS

## Требования к серверу

- Ubuntu 22.04+ или Debian 11+
- Node.js 20.x
- 2GB RAM минимум
- nginx (для reverse proxy и SSL)
- PM2 (для управления процессом)

## 1. Подготовка сервера

```bash
# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Устанавливаем Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Устанавливаем PM2 глобально
sudo npm install -g pm2

# Устанавливаем nginx
sudo apt install -y nginx

# Создаем папку для приложения
sudo mkdir -p /var/www/esoteric-planner
sudo chown $USER:$USER /var/www/esoteric-planner
```

## 2. Загрузка кода

```bash
cd /var/www/esoteric-planner

# Вариант 1: Скачать архив из Replit
# Загрузите ZIP через Download as ZIP в Replit

# Вариант 2: Git (если есть репозиторий)
git clone <your-repo-url> .

# Создаем папку для логов
mkdir -p logs
```

## 3. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```bash
nano .env
```

Содержимое файла:

```env
# Обязательные переменные
NODE_ENV=production
PORT=5000

# База данных (ваша внешняя PostgreSQL)
EXTERNAL_DB_HOST=176.53.161.247
EXTERNAL_DB_PORT=5432
EXTERNAL_DB_NAME=default_db
EXTERNAL_DB_USER=gen_user
EXTERNAL_DB_SCHEMA=esoteric_planner
EXTERNAL_DB_PASSWORD=<ваш_пароль_от_БД>

# API ключи (скопируйте из Replit Secrets)
DEEPSEEK_API_KEY=<ваш_ключ>
RUSENDER_API_KEY=<ваш_ключ>
RUSENDER_FROM_EMAIL=klimova@magic-content.ru

# Оплата Prodamus
PRODAMUS_URL=https://Kati-klimovaa.payform.ru
PRODAMUS_SECRET_KEY=<ваш_ключ>

# Сессии
SESSION_SECRET=<сгенерируйте_длинную_случайную_строку>
```

**Важно:** Замените `<ваш_ключ>` на реальные значения из Replit Secrets.

## 4. Сборка и запуск

```bash
# Устанавливаем зависимости и собираем
npm install

# Запускаем через PM2
pm2 start ecosystem.config.cjs

# Сохраняем конфигурацию PM2 для автозапуска
pm2 save
pm2 startup
```

## 5. Настройка nginx

Создайте конфигурацию nginx:

```bash
sudo nano /etc/nginx/sites-available/esoteric-planner
```

Содержимое:

```nginx
server {
    listen 80;
    server_name magic-content.ru www.magic-content.ru;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

Активируем:

```bash
sudo ln -s /etc/nginx/sites-available/esoteric-planner /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 6. SSL сертификат (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d magic-content.ru -d www.magic-content.ru
```

## 7. Команды управления

```bash
# Статус приложения
pm2 status

# Логи
pm2 logs esoteric-planner

# Перезапуск
pm2 restart esoteric-planner

# Остановка
pm2 stop esoteric-planner

# Обновление кода
cd /var/www/esoteric-planner
git pull  # или загрузите новый архив
npm install
pm2 restart esoteric-planner
```

## 8. Проверка работоспособности

После запуска проверьте:

```bash
# Локально на сервере
curl http://localhost:5000/health

# Через домен (после настройки DNS)
curl https://magic-content.ru/health
```

## Структура файлов после сборки

```
/var/www/esoteric-planner/
├── dist/
│   ├── index.cjs          # Серверный бандл
│   └── public/            # Статические файлы фронтенда
├── ecosystem.config.cjs   # Конфигурация PM2
├── package.json
├── .env                   # Переменные окружения
└── logs/                  # Логи PM2
```

## Обновление Webhook URL для Prodamus

После развертывания обновите Webhook URL в личном кабинете Prodamus:

```
https://magic-content.ru/api/payments/webhook
```

## Устранение проблем

**Приложение не запускается:**
```bash
pm2 logs esoteric-planner --lines 50
```

**Ошибка подключения к БД:**
- Проверьте, что IP вашего VPS добавлен в whitelist PostgreSQL сервера

**502 Bad Gateway:**
- Проверьте, что PM2 запущен: `pm2 status`
- Проверьте порт: `netstat -tlnp | grep 5000`
