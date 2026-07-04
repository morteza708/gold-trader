# Gold Trader

An online melted-gold trading platform with a customer dashboard, admin panel, and full backend infrastructure. Built for gold businesses and domestic exchanges, it supports instant buy/sell, limit orders, wallet management, deposits/withdrawals, and OTP-based authentication.

---

## Features

### End Users
- OTP login via SMS (Kavenegar)
- Profile completion and KYC with national ID card upload
- Dual wallet (Rial + gold in grams)
- Instant gold buy/sell at live prices
- Smart orders (buy at lower price / sell at higher price)
- Multi-account deposit flow with receipt upload
- Rial withdrawals and physical gold pickup
- Trade and transaction history
- Persian PDF invoice download
- In-app and push notifications (PWA)
- RTL UI with Jalali calendar and Persian digits

### Admin Panel
- Statistics dashboard
- User management and phone verification
- Gold price management (base price + margin)
- Kill switch to enable/disable trading
- Trade and order monitoring
- Deposit/withdrawal management with auto-approval via peer deposits
- Deposit bank account management
- System settings (admin phone numbers, gold pickup address)

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────────────────┐
│   Next.js   │────▶│    Nginx    │────▶│  Django REST API (Gunicorn)  │
│  Frontend   │     │ Reverse Proxy│     │  accounts · wallet · trades  │
│   (PWA)     │     └─────────────┘     │  settings · notifications    │
└─────────────┘                         └──────────────┬───────────────┘
                                                       │
                        ┌──────────────────────────────┼──────────────────┐
                        ▼                              ▼                  ▼
                 ┌─────────────┐              ┌─────────────┐    ┌─────────────┐
                 │ PostgreSQL  │              │    Redis    │    │   Celery    │
                 │             │              │             │    │ Worker+Beat │
                 └─────────────┘              └─────────────┘    └─────────────┘
```

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Django 5.2, Django REST Framework, SimpleJWT |
| Database | PostgreSQL 15 |
| Cache / Queue | Redis 7, Celery 5 |
| SMS | Kavenegar |
| PDF | WeasyPrint |
| Deploy | Docker Compose, Nginx, Gunicorn |

---

## Project Structure

```
gold-trader/
├── backend/          # Django API
│   ├── accounts/     # Auth, users, OTP
│   ├── wallet/       # Wallet, deposits, withdrawals
│   ├── trades/       # Trades, pricing, limit orders
│   ├── settings/     # System settings, bank accounts
│   ├── notifications/# Notifications and push
│   └── config/       # Django & Celery config
├── frontend/         # Next.js App Router
│   ├── app/          # Pages (dashboard, adminpanel, auth)
│   ├── components/   # UI components
│   ├── contexts/     # AuthContext
│   ├── hooks/        # Custom hooks
│   └── lib/api/      # API client
├── nginx/            # Reverse proxy config
├── docker-compose.yml
└── .env.example
```

---

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

For local development without Docker:
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

---

## Quick Start (Docker)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/gold-trader.git
cd gold-trader
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Key variables in `.env`:

| Variable | Description |
|----------|-------------|
| `DJANGO_SECRET_KEY` | Django secret key (change in production) |
| `DJANGO_DEBUG` | `True` for development, `False` for production |
| `DB_*` | PostgreSQL connection settings |
| `KAVENEGAR_API_KEY` | Kavenegar SMS API key |
| `NEXT_PUBLIC_API_URL` | API URL for the frontend |
| `ALLOWED_HOSTS` | Allowed domains (comma-separated) |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins |

### 3. Start services

```bash
docker compose build
docker compose up -d
```

### 4. Create an admin user

```bash
docker compose exec backend python manage.py createsuperuser
```

### 5. Access

| Service | URL |
|---------|-----|
| Website (via Nginx) | http://localhost |
| API | http://localhost/api |
| Django Admin | http://localhost/admin |
| Frontend direct (dev) | http://localhost:3000 |

---

## API Endpoints (Summary)

### Authentication
- `POST /api/auth/send-otp/` — Send OTP code
- `POST /api/auth/verify-otp/` — Verify OTP and receive JWT
- `GET /api/auth/user/` — Current user info

### Trades
- `GET /api/trades/price/` — Current gold price
- `POST /api/trades/buy/` — Instant buy
- `POST /api/trades/sell/` — Instant sell
- `GET/POST /api/trades/orders/` — Limit orders
- `GET /api/trades/` — Trade history
- `GET /api/trades/<id>/invoice/` — Download PDF invoice

### Wallet
- `GET /api/wallet/` — Balance
- `POST /api/wallet/deposit/` — Create deposit request
- `POST /api/wallet/withdraw/` — Create withdrawal request
- `GET /api/wallet/cards/` — Bank cards

### Admin
- `GET /api/admin/dashboard/stats/` — Dashboard stats
- `GET/POST /api/admin/trades/price/update/` — Price management
- `POST /api/admin/trades/status/toggle/` — Enable/disable trading

> Full routes are defined in `backend/*/urls.py`.

---

## User Roles

| Role | Access |
|------|--------|
| `CUSTOMER` | User dashboard, trades, wallet |
| `SITE_ADMIN` | Admin panel |
| `SUPER_ADMIN` | Full access + Django Admin |

---

## Celery Tasks

Celery Beat checks pending limit orders every 30 seconds and executes them when the target price is reached.

```python
# config/settings.py
CELERY_BEAT_SCHEDULE = {
    'check-and-execute-pending-orders': {
        'task': 'trades.tasks.check_and_execute_pending_orders',
        'schedule': 30.0,
    },
}
```

---

## PWA

This project supports Progressive Web App features:
- `manifest.json` for mobile installation
- Service Worker for push notifications

---

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Celery (optional)

```bash
cd backend
celery -A config worker --loglevel=info
celery -A config beat --loglevel=info
```

---

## Security

Before going public or deploying to production:

- [ ] Change `DJANGO_SECRET_KEY`
- [ ] Set `DJANGO_DEBUG=False`
- [ ] Keep real Kavenegar keys only in server `.env` (never in Git)
- [ ] Use a strong database password
- [ ] Enable SSL/TLS
- [ ] Never commit `.env` files

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Contributing

1. Fork the repository
2. Create a branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes
4. Open a Pull Request

---

## Contact

Report bugs or suggest features via [GitHub Issues](https://github.com/YOUR_USERNAME/gold-trader/issues).

---
---

# گلد تریدر

پلتفرم معاملات آنلاین طلای آب‌شده با پنل کاربری، پنل مدیریت و زیرساخت کامل بک‌اند. این پروژه برای کسب‌وکارهای طلا و صرافی‌های داخلی طراحی شده و امکان خرید/فروش فوری، سفارش هوشمند (Limit Order)، مدیریت کیف پول، واریز/برداشت و احراز هویت با OTP را فراهم می‌کند.

---

## ویژگی‌ها

### کاربر نهایی
- ورود با OTP از طریق پیامک (Kavenegar)
- تکمیل پروفایل و احراز هویت (KYC) با کارت ملی
- کیف پول دوگانه (ریال + طلا به گرم)
- خرید و فروش فوری طلا با قیمت لحظه‌ای
- سفارش هوشمند (خرید در قیمت پایین‌تر / فروش در قیمت بالاتر)
- واریز وجه با تخصیص چند حساب مقصد و آپلود فیش
- برداشت ریالی و برداشت فیزیکی طلا
- تاریخچه معاملات و تراکنش‌ها
- دانلود فاکتور PDF فارسی
- اعلان‌های درون‌برنامه‌ای و Push Notification (PWA)
- رابط کاربری RTL، تاریخ شمسی و اعداد فارسی

### پنل مدیریت
- داشبورد آماری
- مدیریت کاربران و تایید شماره موبایل
- مدیریت قیمت طلا (پایه + حاشیه سود)
- Kill Switch برای فعال/غیرفعال کردن معاملات
- مانیتورینگ معاملات و سفارشات
- مدیریت واریز، برداشت و تایید خودکار برداشت از طریق واریز سایر کاربران
- مدیریت حساب‌های بانکی واریز
- تنظیمات سیستم (شماره مدیران، آدرس تحویل طلا)

---

## معماری

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────────────────┐
│   Next.js   │────▶│    Nginx    │────▶│  Django REST API (Gunicorn)  │
│  Frontend   │     │ Reverse Proxy│     │  accounts · wallet · trades  │
│   (PWA)     │     └─────────────┘     │  settings · notifications    │
└─────────────┘                         └──────────────┬───────────────┘
                                                       │
                        ┌──────────────────────────────┼──────────────────┐
                        ▼                              ▼                  ▼
                 ┌─────────────┐              ┌─────────────┐    ┌─────────────┐
                 │ PostgreSQL  │              │    Redis    │    │   Celery    │
                 │             │              │             │    │ Worker+Beat │
                 └─────────────┘              └─────────────┘    └─────────────┘
```

| لایه | تکنولوژی |
|------|----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Django 5.2, Django REST Framework, SimpleJWT |
| Database | PostgreSQL 15 |
| Cache / Queue | Redis 7, Celery 5 |
| SMS | Kavenegar |
| PDF | WeasyPrint |
| Deploy | Docker Compose, Nginx, Gunicorn |

---

## ساختار پروژه

```
gold-trader/
├── backend/          # Django API
│   ├── accounts/     # احراز هویت، کاربران، OTP
│   ├── wallet/       # کیف پول، واریز، برداشت
│   ├── trades/       # معاملات، قیمت، سفارش هوشمند
│   ├── settings/     # تنظیمات سیستم، حساب‌های بانکی
│   ├── notifications/# اعلان‌ها و Push
│   └── config/       # تنظیمات Django، Celery
├── frontend/         # Next.js App Router
│   ├── app/          # صفحات (dashboard, adminpanel, auth)
│   ├── components/   # کامپوننت‌های UI
│   ├── contexts/     # AuthContext
│   ├── hooks/        # Custom hooks
│   └── lib/api/      # API client
├── nginx/            # پیکربندی Reverse Proxy
├── docker-compose.yml
└── .env.example
```

---

## پیش‌نیازها

- Docker 20.10+
- Docker Compose 2.0+

برای اجرای بدون Docker:
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

---

## راه‌اندازی سریع (Docker)

### ۱. کلون کردن مخزن

```bash
git clone https://github.com/YOUR_USERNAME/gold-trader.git
cd gold-trader
```

### ۲. تنظیم متغیرهای محیطی

```bash
cp .env.example .env
```

مقادیر مهم در `.env`:

| متغیر | توضیح |
|-------|-------|
| `DJANGO_SECRET_KEY` | کلید امنیتی Django (در production حتماً تغییر دهید) |
| `DJANGO_DEBUG` | `True` برای توسعه، `False` برای production |
| `DB_*` | اطلاعات اتصال PostgreSQL |
| `KAVENEGAR_API_KEY` | کلید API سرویس پیامک کاوه‌نگار |
| `NEXT_PUBLIC_API_URL` | آدرس API برای فرانت‌اند |
| `ALLOWED_HOSTS` | دامنه‌های مجاز (جدا شده با کاما) |
| `CORS_ALLOWED_ORIGINS` | Originهای مجاز CORS |

### ۳. اجرای سرویس‌ها

```bash
docker compose build
docker compose up -d
```

### ۴. ایجاد ادمین

```bash
docker compose exec backend python manage.py createsuperuser
```

### ۵. دسترسی

| سرویس | آدرس |
|-------|------|
| وب‌سایت (از طریق Nginx) | http://localhost |
| API | http://localhost/api |
| Django Admin | http://localhost/admin |
| Frontend مستقیم (dev) | http://localhost:3000 |

---

## API Endpoints (خلاصه)

### احراز هویت
- `POST /api/auth/send-otp/` — ارسال کد OTP
- `POST /api/auth/verify-otp/` — تایید OTP و دریافت JWT
- `GET /api/auth/user/` — اطلاعات کاربر جاری

### معاملات
- `GET /api/trades/price/` — قیمت فعلی طلا
- `POST /api/trades/buy/` — خرید فوری
- `POST /api/trades/sell/` — فروش فوری
- `GET/POST /api/trades/orders/` — سفارشات هوشمند
- `GET /api/trades/` — تاریخچه معاملات
- `GET /api/trades/<id>/invoice/` — دانلود فاکتور PDF

### کیف پول
- `GET /api/wallet/` — موجودی
- `POST /api/wallet/deposit/` — درخواست واریز
- `POST /api/wallet/withdraw/` — درخواست برداشت
- `GET /api/wallet/cards/` — کارت‌های بانکی

### مدیریت
- `GET /api/admin/dashboard/stats/` — آمار داشبورد
- `GET/POST /api/admin/trades/price/update/` — مدیریت قیمت
- `POST /api/admin/trades/status/toggle/` — فعال/غیرفعال معاملات

> مسیرهای کامل در فایل‌های `backend/*/urls.py` تعریف شده‌اند.

---

## نقش‌های کاربری

| نقش | دسترسی |
|-----|--------|
| `CUSTOMER` | پنل کاربری، معاملات، کیف پول |
| `SITE_ADMIN` | پنل مدیریت |
| `SUPER_ADMIN` | دسترسی کامل + Django Admin |

---

## Celery Tasks

Celery Beat هر ۳۰ ثانیه سفارشات هوشمند در انتظار را بررسی و در صورت رسیدن قیمت به هدف، اجرا می‌کند.

```python
# config/settings.py
CELERY_BEAT_SCHEDULE = {
    'check-and-execute-pending-orders': {
        'task': 'trades.tasks.check_and_execute_pending_orders',
        'schedule': 30.0,
    },
}
```

---

## PWA

پروژه از Progressive Web App پشتیبانی می‌کند:
- `manifest.json` برای نصب روی موبایل
- Service Worker برای Push Notification

---

## توسعه محلی (بدون Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Celery (اختیاری)

```bash
cd backend
celery -A config worker --loglevel=info
celery -A config beat --loglevel=info
```

---

## امنیت

قبل از انتشار عمومی یا استقرار Production:

- [ ] `DJANGO_SECRET_KEY` را تغییر دهید
- [ ] `DJANGO_DEBUG=False` تنظیم شود
- [ ] کلید Kavenegar واقعی فقط در `.env` سرور باشد (نه در Git)
- [ ] رمز عبور دیتابیس قوی انتخاب شود
- [ ] SSL/TLS فعال شود
- [ ] فایل `.env` هرگز commit نشود

---

## مجوز

این پروژه تحت مجوز [MIT](LICENSE) منتشر شده است.

---

## مشارکت

1. Fork کنید
2. یک branch جدید بسازید (`git checkout -b feature/amazing-feature`)
3. تغییرات را commit کنید
4. Pull Request ارسال کنید

---

## تماس

برای گزارش باگ یا پیشنهاد، از بخش [Issues](https://github.com/YOUR_USERNAME/gold-trader/issues) گیت‌هاب استفاده کنید.
