# Руководство по развертыванию QuizMaster

## 📦 Варианты развертывания

### 1. Локальная разработка (Frontend только)

Самый простой способ для быстрого старта:

```bash
# 1. Скачайте файлы
git clone <repository-url>
cd quizmaster

# 2. Откройте index.html в браузере
# Или используйте локальный сервер:

# Python
python -m http.server 8000

# Node.js
npx http-server -p 8000

# PHP
php -S localhost:8000

# 3. Откройте http://localhost:8000
```

**Особенности:**
- ✅ Нет необходимости в бэкенде
- ✅ Данные хранятся в localStorage
- ❌ Данные не синхронизируются между устройствами
- ❌ Нет защиты от потери данных

---

### 2. Полное развертывание с Backend

#### Требования:
- Node.js 16+
- PostgreSQL 13+
- Git

#### Шаг 1: Установка Backend

```bash
# Клонирование репозитория
git clone <repository-url>
cd quizmaster

# Установка зависимостей
npm install

# Создание файла конфигурации
cp .env.example .env

# Отредактируйте .env файл с вашими настройками
nano .env
```

#### Шаг 2: Настройка базы данных

```bash
# Войдите в PostgreSQL
psql -U postgres

# Выполните SQL скрипт
\i database.sql

# Или из командной строки:
psql -U postgres -f database.sql

# Проверьте создание таблиц
psql -U postgres -d quizmaster -c "\dt"
```

#### Шаг 3: Запуск сервера

```bash
# Режим разработки (с автоперезагрузкой)
npm run dev

# Production режим
npm start
```

Сервер будет доступен по адресу: `http://localhost:3000`

---

### 3. Развертывание на Heroku

#### Требования:
- Аккаунт Heroku
- Heroku CLI

```bash
# Установка Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Вход в Heroku
heroku login

# Создание приложения
heroku create quizmaster-app

# Добавление PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Установка переменных окружения
heroku config:set JWT_SECRET=your_secret_key_here
heroku config:set NODE_ENV=production

# Деплой
git push heroku main

# Миграция базы данных
heroku run node migrations/migrate.js

# Открытие приложения
heroku open
```

---

### 4. Развертывание на AWS

#### Использование AWS Elastic Beanstalk

```bash
# Установка EB CLI
pip install awsebcli

# Инициализация
eb init -p node.js quizmaster

# Создание окружения
eb create quizmaster-env

# Настройка базы данных RDS
# Через AWS Console создайте PostgreSQL RDS instance

# Установка переменных окружения
eb setenv DB_HOST=your-rds-endpoint \
         DB_NAME=quizmaster \
         DB_USER=postgres \
         DB_PASSWORD=your_password \
         JWT_SECRET=your_secret

# Деплой
eb deploy

# Открытие приложения
eb open
```

#### Использование EC2

```bash
# 1. Создайте EC2 инстанс (Ubuntu 22.04 LTS)

# 2. Подключитесь по SSH
ssh -i your-key.pem ubuntu@your-ec2-ip

# 3. Установите Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. Установите PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# 5. Клонируйте репозиторий
git clone <repository-url>
cd quizmaster

# 6. Установите зависимости
npm install

# 7. Настройте PostgreSQL
sudo -u postgres createdb quizmaster
sudo -u postgres psql quizmaster < database.sql

# 8. Настройте Nginx как reverse proxy
sudo apt-get install nginx

# 9. Создайте конфигурацию Nginx
sudo nano /etc/nginx/sites-available/quizmaster

# Содержимое конфигурации:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 10. Активируйте конфигурацию
sudo ln -s /etc/nginx/sites-available/quizmaster /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 11. Используйте PM2 для управления процессом
sudo npm install -g pm2
pm2 start server.js --name quizmaster
pm2 startup
pm2 save

# 12. Настройте SSL с Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

### 5. Развертывание на DigitalOcean

#### Использование App Platform

```bash
# 1. Создайте аккаунт DigitalOcean

# 2. Создайте новое приложение через веб-интерфейс:
#    - Выберите ваш GitHub репозиторий
#    - Выберите Node.js как среду выполнения
#    - Добавьте PostgreSQL managed database

# 3. Настройте переменные окружения в веб-интерфейсе

# 4. Деплой происходит автоматически при пуше в main ветку
```

#### Использование Droplet

Аналогично инструкции для AWS EC2, но с использованием DigitalOcean Droplet.

---

### 6. Развертывание на Vercel (Frontend)

```bash
# Установка Vercel CLI
npm i -g vercel

# Деплой
vercel --prod

# Или через GitHub:
# 1. Импортируйте проект в Vercel через веб-интерфейс
# 2. Vercel автоматически определит настройки
# 3. Деплой происходит при каждом пуше
```

---

### 7. Развертывание на Netlify (Frontend)

```bash
# Установка Netlify CLI
npm install -g netlify-cli

# Логин
netlify login

# Инициализация
netlify init

# Деплой
netlify deploy --prod

# Или через веб-интерфейс:
# 1. Перетащите папку с файлами на netlify.com
# 2. Или подключите GitHub репозиторий
```

---

### 8. Docker развертывание

#### Создание Dockerfile

```dockerfile
# Dockerfile для backend
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=db
      - DB_PORT=5432
      - DB_NAME=quizmaster
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - JWT_SECRET=your_secret_key
    depends_on:
      - db
    volumes:
      - ./logs:/app/logs

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=quizmaster
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

  frontend:
    image: nginx:alpine
    volumes:
      - ./:/usr/share/nginx/html
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

#### Команды Docker

```bash
# Сборка и запуск
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down

# Остановка с удалением volumes
docker-compose down -v
```

---

## 🔒 Безопасность в Production

### Обязательные настройки:

1. **Используйте HTTPS**
```bash
# С Let's Encrypt
sudo certbot --nginx -d yourdomain.com
```

2. **Установите сильные пароли**
```bash
# Генерация случайного ключа
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. **Настройте firewall**
```bash
# UFW на Ubuntu
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

4. **Используйте environment variables**
```bash
# Никогда не коммитьте .env файл!
echo ".env" >> .gitignore
```

5. **Включите rate limiting**
```javascript
// Уже реализовано в server.js
const rateLimit = require('express-rate-limit');
```

6. **Обновляйте зависимости**
```bash
npm audit
npm audit fix
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions пример

Создайте `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Deploy to production
      run: |
        # Ваши команды деплоя
        ssh user@server 'cd /app && git pull && npm install && pm2 restart all'
```

---

## 📊 Мониторинг

### Использование PM2

```bash
# Установка PM2
npm install -g pm2

# Запуск с мониторингом
pm2 start server.js --name quizmaster

# Мониторинг
pm2 monit

# Логи
pm2 logs quizmaster

# Статус
pm2 status
```

### Настройка логирования

```javascript
// Использование Winston
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

---

## 🧪 Тестирование перед деплоем

```bash
# Установка зависимостей для тестирования
npm install --save-dev jest supertest

# Запуск тестов
npm test

# Coverage
npm test -- --coverage
```

---

## 📝 Чеклист перед деплоем

- [ ] Все переменные окружения настроены
- [ ] База данных создана и мигрирована
- [ ] HTTPS настроен
- [ ] CORS правильно настроен
- [ ] Rate limiting включен
- [ ] Логирование работает
- [ ] Backup база данных настроен
- [ ] Мониторинг работает
- [ ] DNS записи настроены
- [ ] SSL сертификат валиден
- [ ] Firewall настроен
- [ ] Все тесты проходят

---

## 🆘 Решение проблем

### База данных не подключается
```bash
# Проверьте статус PostgreSQL
sudo systemctl status postgresql

# Проверьте права доступа
sudo nano /etc/postgresql/13/main/pg_hba.conf
```

### Порт уже занят
```bash
# Найдите процесс
lsof -i :3000

# Убейте процесс
kill -9 <PID>
```

### Out of Memory
```bash
# Увеличьте swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи: `pm2 logs` или `docker-compose logs`
2. Проверьте документацию
3. Откройте issue в GitHub
4. Проверьте переменные окружения

---

Успешного развертывания! 🚀
