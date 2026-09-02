# OpalBox (Gold Trader)

An online melted-gold trading platform (**OpalBox / گلد تریدر**) with a customer dashboard, admin panel, and full backend infrastructure. Built for gold businesses and domestic exchanges: instant buy/sell, smart orders, wallet management, simplified deposit/withdrawal flows, Support Hub, and OTP-based authentication.

**Repository:** [github.com/morteza708/gold-trader](https://github.com/morteza708/gold-trader)

---

## Features

### End Users
- OTP login via SMS (Kavenegar)
- Profile completion and KYC with national ID card upload
- Dual wallet (Rial + gold in grams) with locked balance for pending trades/withdrawals
- Instant gold buy/sell at live or admin-set prices
- **Smart orders** (buy at lower price / sell at higher price) — formerly “limit orders”
- **Pending purchase** flow: lock price, deposit later within expiry window
- **One-step deposit:** amount + destination account + receipt + tracking + date in a single request
- Rial withdrawal to bank card; physical gold withdrawal with pickup address
- Bank card management (add card with live preview showing account holder name)
- Trade and transaction history with Persian PDF invoice download
- In-app notifications (bell) + PWA install prompt
- **Support Hub:** floating help button, phone / WhatsApp / Telegram / email, business hours
- RTL UI, Jalali calendar, Persian digits
- Public CMS pages: About, Contact

### Admin Panel
- Statistics dashboard and **Command Room** (market control)
- User management and mobile verification approval
- Gold price management (manual base + margin, or **live feed from Viragold API**)
- Separate **buy / sell kill switches** + public market notice banner
- Trade, order, and pending-purchase monitoring
- **Finance:** deposits, Rial withdrawals, gold withdrawals (separate tabs)
- **One-step Rial withdrawal:** upload transfer receipt + optional tracking → complete in one action
- **Gold withdrawal (two steps):** approve → ready for pickup → mark in-person delivery complete
- **Deposit bank accounts** tab with active/inactive toggle
- **Support Hub** settings: channels, weekly schedule, online/offline messages, live preview
- **Site pages** CMS (About / Contact — text and images)
- System settings: admin SMS numbers (internal alerts), gold pickup address
- Auto-refresh on finance pages when tab is visible (polling)

---

## Business Flows

### Deposit (user → admin)
1. User submits **one form**: amount, platform deposit account, receipt image, tracking number, deposit date.
2. Admin reviews receipt in finance panel → **Approve** → user balance credited.
3. SMS: admin notified on receipt upload; user notified on approval.

### Rial withdrawal (user → admin)
1. User requests withdrawal to a saved bank card; balance locked immediately.
2. Admin opens request → sees bank card → uploads **transfer receipt** → **Confirm & complete** (single step).
3. SMS: `withdrawal-receipt-uploaded-user` only (no separate “approved” SMS).

### Gold withdrawal (user → admin)
1. User requests gold withdrawal in grams.
2. Admin **approves** → status **Ready for pickup**; user sees pickup address.
3. Admin **registers in-person delivery** after handover → **Delivered**.
4. SMS on approve and on delivery complete.

### Support Hub
- Configured in **Admin → Settings → Support**.
- Public API: `GET /api/support/info/` (online/offline, channels, hours).
- Dashboard floating button; also shown on public Contact and dashboard About pages.
- Phone calls disabled outside business hours; WhatsApp/Telegram remain available for async messages.

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
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion |
| Backend | Django 5.2, Django REST Framework, SimpleJWT |
| Database | PostgreSQL 15 |
| Cache / Queue | Redis 7, Celery 5 |
| SMS | Kavenegar (template-based) |
| PDF | WeasyPrint |
| Deploy | Docker Compose, Nginx, Gunicorn, WhiteNoise |

---

## Project Structure

```
gold-trader/
├── backend/
│   ├── accounts/       # Auth, users, OTP, image upload helpers
│   ├── wallet/         # Wallet, deposits, withdrawals, bank cards
│   ├── trades/         # Trades, pricing, smart orders, pending purchase
│   ├── settings/       # System settings, deposit accounts, site pages, Support Hub
│   ├── notifications/  # In-app notifications
│   └── config/         # Django & Celery config
├── frontend/
│   ├── app/            # dashboard, adminpanel, auth, contact, about
│   ├── components/
│   │   ├── support/    # SupportFab, SupportHubPanel
│   │   ├── admin/      # DepositDetailModal, SupportSettingsTab, MarketControlPanel
│   │   └── ui/         # ImageUploadZone, shared inputs
│   ├── hooks/          # useSupportInfo, useVisibilityPolling, useGoldPrice, …
│   └── lib/api/        # auth, trades, support, pages
├── nginx/
├── docker-compose.yml              # Local development
├── docker-compose.production.yml   # Production
├── deploy.sh                       # Server deploy helper
└── .env.example
```

---

## Prerequisites

- Docker 20.10+ and Docker Compose 2.0+

For local development without Docker: Python 3.11+, Node.js 20+, PostgreSQL 15+, Redis 7+.

---

## Quick Start (Docker — local)

```bash
git clone https://github.com/morteza708/gold-trader.git
cd gold-trader
cp .env.example .env
# Edit .env (SECRET_KEY, KAVENEGAR_API_KEY, DB passwords, …)

docker compose build
docker compose up -d

docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

| Service | URL |
|---------|-----|
| Website (Nginx) | http://localhost |
| API | http://localhost/api |
| Django Admin | http://localhost/admin |

---

## Production Deployment

Production uses `docker-compose.production.yml`. Typical server path: `/var/www/gold-trader`.

```bash
cd /var/www/gold-trader
git pull origin main

# Frontend is baked into the image — rebuild when UI changes
docker compose -f docker-compose.production.yml build frontend backend celery_worker celery_beat
docker compose -f docker-compose.production.yml up -d frontend backend celery_worker celery_beat

docker compose -f docker-compose.production.yml exec -T backend python manage.py migrate --noinput
```

Backend code is volume-mounted in production, so **backend-only changes** often need only:

```bash
docker compose -f docker-compose.production.yml restart backend celery_worker
```

Or use the included script:

```bash
bash deploy.sh
```

> **Note:** `deploy.sh` restarts services but does **not** rebuild the frontend image. After UI changes, run `build frontend` manually.

### Key environment variables

| Variable | Description |
|----------|-------------|
| `DJANGO_SECRET_KEY` | Django secret (required in production) |
| `DJANGO_DEBUG` | `False` in production |
| `DB_*` | PostgreSQL credentials |
| `KAVENEGAR_API_KEY` | SMS API key |
| `NEXT_PUBLIC_API_URL` | e.g. `https://opalbox.ir/api` |
| `NEXT_PUBLIC_SITE_URL` | Public site URL |
| `NEXT_PUBLIC_BRAND_*` | Brand name, logo, theme color |
| `ALLOWED_HOSTS` | Comma-separated domains |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins |

---

## API Endpoints (Summary)

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/send-otp/` | Send OTP |
| POST | `/api/auth/verify-otp/` | Verify OTP → JWT |
| GET | `/api/auth/user/` | Current user |

### Trades
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/trades/price/` | Current gold price |
| POST | `/api/trades/buy/` | Instant buy |
| POST | `/api/trades/sell/` | Instant sell |
| GET/POST | `/api/trades/orders/` | Smart orders |
| GET | `/api/trades/<id>/invoice/` | PDF invoice |

### Wallet (user)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/wallet/` | Balances |
| POST | `/api/wallet/deposit/` | Create deposit (one-step) |
| POST | `/api/wallet/withdraw/` | Create withdrawal |
| GET | `/api/wallet/cards/` | Bank cards |
| GET | `/api/wallet/gold-pickup-address/` | Pickup address |

### Wallet (admin)
| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/admin/wallet/deposits/<id>/approve-new/` | Approve deposit |
| POST | `/api/admin/wallet/withdrawals/<id>/complete-rial/` | Complete Rial withdrawal + receipt |
| PATCH | `/api/admin/wallet/withdrawals/<id>/approve/` | Approve gold withdrawal |
| PATCH | `/api/admin/wallet/withdrawals/<id>/complete/` | Mark gold delivered |

### Settings & Support
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/support/info/` | Public Support Hub info |
| GET/PUT | `/api/admin/settings/` | System + Support Hub settings |
| GET/PUT | `/api/admin/wallet/deposit-accounts/` | Deposit bank accounts |
| GET | `/api/pages/<slug>/` | Public site page (`about`, `contact`) |
| GET/PUT | `/api/admin/pages/<slug>/` | Edit site pages |

Full routes: `backend/*/urls.py`.

---

## User Roles

| Role | Access |
|------|--------|
| `CUSTOMER` | Dashboard, trades, wallet |
| `SITE_ADMIN` | Admin panel |
| `SUPER_ADMIN` | Full access + Django Admin |

---

## Celery & Background Jobs

- **Smart orders:** Beat checks pending orders every 30s and executes at target price.
- **Gold price sync:** Optional live feed from Viragold API (when enabled).
- **SMS:** Async via Celery (`send_sms_async`) for withdrawal/deposit notifications.

---

## PWA

- `manifest.json` for install on mobile/desktop
- Service Worker (`public/sw.js`)
- Browser notification permission prompt

---

## Local Development (without Docker)

```bash
# Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
python manage.py migrate && python manage.py runserver

# Frontend
cd frontend && npm install && npm run dev

# Celery (optional)
cd backend
celery -A config worker --loglevel=info
celery -A config beat --loglevel=info
```

---

## Security Checklist (production)

- [ ] Change `DJANGO_SECRET_KEY`
- [ ] Set `DJANGO_DEBUG=False`
- [ ] Keep Kavenegar keys only in server `.env`
- [ ] Strong database password
- [ ] Enable SSL/TLS (Let's Encrypt + Nginx)
- [ ] Never commit `.env` files

---

## License

MIT — see [LICENSE](LICENSE).

---

## Contributing & Issues

[github.com/morteza708/gold-trader/issues](https://github.com/morteza708/gold-trader/issues)

---

<br>

# اپال‌باکس (گلد تریدر)

پلتفرم معاملات آنلاین طلای آب‌شده با پنل کاربری، پنل مدیریت و API کامل Django. شامل خرید/فروش فوری، **سفارش هوشمند**، کیف پول، واریز/برداشت ساده‌شده، **Support Hub** و احراز هویت OTP.

**مخزن:** [github.com/morteza708/gold-trader](https://github.com/morteza708/gold-trader)

---

## ویژگی‌ها

### کاربر
- ورود OTP (کاوه‌نگار)، KYC با کارت ملی
- کیف پول ریال + طلا (گرم)، موجودی قفل‌شده برای معامله/برداشت معلق
- خرید/فروش فوری، **سفارش هوشمند**، خرید معلق با قیمت قفل
- **واریز یک‌مرحله‌ای:** مبلغ + حساب + فیش + پیگیری + تاریخ
- برداشت ریالی به کارت؛ برداشت طلا با آدرس تحویل
- مدیریت کارت بانکی (پیش‌نمایش با نام کاربر)
- تاریخچه، فاکتور PDF فارسی، اعلان in-app
- **Support Hub:** دکمه شناور، تماس / واتساپ / تلگرام / ایمیل، ساعات کاری
- UI راست‌چین، تاریخ شمسی، صفحات درباره ما و تماس

### پنل مدیریت
- اتاق فرمان: قیمت، **قطع جداگانه خرید/فروش**، پیام بنر بازار
- کاربران، تأیید موبایل، مانیتورینگ معاملات
- مالی: واریز، برداشت ریال، برداشت طلا
- **برداشت ریال یک‌مرحله‌ای:** فیش + تأیید و تکمیل
- **برداشت طلا دو مرحله:** تأیید → آماده تحویل → ثبت تحویل حضوری
- **تعریف کارت** (حساب‌های واریز) با سوئیچ فعال/غیرفعال
- **تب پشتیبانی:** کانال‌ها، برنامه هفتگی، پیش‌نمایش زنده
- **صفحات سایت** (CMS): درباره ما / تماس با ما
- تنظیمات: شماره SMS مدیران (داخلی)، آدرس تحویل طلا
- رفرش خودکار لیست مالی هنگام باز بودن تب

---

## فرآیندهای اصلی

| فرآیند | خلاصه |
|--------|--------|
| **واریز** | کاربر یک فرم → مدیر فیش را می‌بیند → تأیید → شارژ کیف پول |
| **برداشت ریال** | کاربر درخواست → مدیر فیش واریز آپلود + «تأیید واریز و تکمیل» |
| **برداشت طلا** | تأیید → آماده تحویل (نمایش آدرس) → تحویل حضوری |
| **Support Hub** | تنظیم از پنل → API عمومی → دکمه شناور dashboard |

---

## استقرار Production

مسیر سرور: `/var/www/gold-trader`

```bash
cd /var/www/gold-trader
git pull origin main

docker compose -f docker-compose.production.yml build frontend backend celery_worker celery_beat
docker compose -f docker-compose.production.yml up -d frontend backend celery_worker celery_beat

docker compose -f docker-compose.production.yml exec -T backend python manage.py migrate --noinput
```

تغییرات فقط backend (با volume mount):

```bash
docker compose -f docker-compose.production.yml restart backend celery_worker
```

تغییرات UI حتماً نیاز به `build frontend` دارد.

---

## API (خلاصه)

| بخش | نمونه مسیر |
|-----|-----------|
| احراز هویت | `POST /api/auth/send-otp/` |
| قیمت / معامله | `GET /api/trades/price/` |
| واریز | `POST /api/wallet/deposit/` |
| Support Hub | `GET /api/support/info/` |
| تنظیمات ادمین | `GET/PUT /api/admin/settings/` |
| تکمیل برداشت ریال | `POST /api/admin/wallet/withdrawals/<id>/complete-rial/` |
| تحویل طلا | `PATCH /api/admin/wallet/withdrawals/<id>/complete/` |

مسیرهای کامل: `backend/*/urls.py`

---

## نقش‌ها

| نقش | دسترسی |
|-----|--------|
| `CUSTOMER` | پنل کاربری |
| `SITE_ADMIN` | پنل مدیریت |
| `SUPER_ADMIN` | دسترسی کامل + Django Admin |

---

## Celery

- بررسی سفارش هوشمند هر ۳۰ ثانیه
- همگام‌سازی قیمت از API (در صورت فعال بودن)
- ارسال SMS غیرهمزمان

---

## توسعه محلی

```bash
docker compose build && docker compose up -d          # Docker
# یا backend: runserver + frontend: npm run dev         # بدون Docker
```

---

## امنیت

- `DJANGO_DEBUG=False` در production
- کلید Kavenegar فقط در `.env` سرور
- SSL فعال
- commit نکردن `.env`

---

## مجوز و مشارکت

MIT — [LICENSE](LICENSE)  
Issues: [github.com/morteza708/gold-trader/issues](https://github.com/morteza708/gold-trader/issues)
