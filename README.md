# OpalBox (Gold Trader)

An online melted-gold trading platform (**OpalBox / گلد تریدر**) with a customer dashboard, admin panel, and full backend infrastructure. Built for gold businesses and domestic exchanges: instant buy/sell, smart orders, wallet management, simplified deposit/withdrawal flows, Support Hub, and OTP-based authentication.

**Repository:** [github.com/morteza708/gold-trader](https://github.com/morteza708/gold-trader)

---

## Features

### End Users
- OTP login via SMS (Kavenegar); works for users created from admin **or** manual invoices
- Profile completion and KYC with national ID card upload
- **Birth date:** day + Persian month select + year (numeric, Persian digits)
- Dual wallet (Rial + gold in grams) with locked balance for pending trades/withdrawals
- Instant gold buy/sell at live or admin-set prices
- **Smart orders** (buy at lower price / sell at higher price)
- **Pending purchase** flow: lock price, deposit later within expiry window
- **One-step deposit:** amount + destination account + receipt + tracking + date in a single request
- Rial withdrawal to bank card; physical gold withdrawal with pickup address + delivery invoice PDF
- Bank card management (add card with live preview showing account holder name)
- Trade and transaction history with Persian **A5 PDF invoice** download
- In-app notifications (bell) + **Web Push** (device notifications)
- **Notification enable modal** on dashboard entry when push is off
- PWA install prompt
- **Support Hub:** floating help button, phone / WhatsApp / Telegram / email, business hours
- Welcome onboarding guide for new customers
- RTL UI, Jalali calendar, Persian digits / karat & gram formatting
- Public CMS pages: About, Contact

### Admin Panel
- Statistics dashboard and **Command Room** (market control)
- **Treasury & audit:** company gold vault, coverage ratio, operational journal, debtors/creditors, P&L, CSV export, auto-block user buy on shortfall
- **Manual invoices:** phone/in-person buy/sell with wallet or out-of-system settlement; physical delivery fields; customer auto-create for OTP login
- **Reygiri (assay) lookup** API integrated in admin + user panel
- User management, customer activity, and mobile verification approval
- Gold price management (manual base + margin, or **live Viragold API** → Rial, history for charts)
- Separate **buy / sell kill switches** + public market notice banner
- Trade, order, and pending-purchase monitoring (platform / manual channel filter)
- **Finance:** deposits, Rial withdrawals, gold withdrawals (separate tabs)
- **One-step Rial withdrawal:** upload transfer receipt + optional tracking → complete
- **Gold withdrawal:** approve → ready for pickup → complete with delivery document (`GD-####`) + PDF
- **Deposit bank accounts** tab with active/inactive toggle
- **Support Hub** settings: channels, weekly schedule, online/offline messages, live preview
- **Site pages** CMS (About / Contact)
- **Invoice issuer settings:** brand, company, national ID, address, phone, logo, **seller stamp/signature** (auto crop + transparent PNG for PDF)
- First-time **admin setup checklist**
- Auto-refresh on finance pages when tab is visible (polling)

---

## Recent Updates (Aug–Sep 2026)

High-level product progress reflected on GitHub. Grouped by theme (newest work first within each group).

### Auth, onboarding & notifications
- Fixed OTP login for customers created only via **manual invoice** (no stale JWT on public OTP endpoints; correct `profile_completed`; unusable password on create)
- Split Jalali birth date into **day / Persian month / year** on registration & profile
- **Notification enable modal** for customer + admin panels when device push is off
- Completed **Web Push + PWA** (VAPID subscribe, service worker, permission flows)
- OTP autofill (WebOTP / one-time-code), iOS Safari focus fixes
- Welcome onboarding modal with short step-by-step guide

### Manual invoices & delivery documents
- Admin **manual invoice** create/edit: buy/sell, settlement modes, payment/delivery status
- Physical delivery fields (actual karat, physical weight, packet code, lab, difference, notes)
- Auto **ensure customer** by mobile (phone verified, incomplete profile until KYC)
- Gold withdrawal completion issues **GD-####** delivery invoice + PDF
- Platform ledger stays on **750-equivalent grams**; physical difference is not forced into vault P&L

### Invoices (PDF + preview)
- Unified **IRANYekan** font for trade + gold-delivery PDFs
- Seller **stamp/signature** upload; PDF processing crops black padding and uses transparent PNG
- Larger stamp display on A5; preview matches
- Fixed blank PDF (`</style>` truncation) and **single-page A5** layout (removed forced min-height)
- Header layout: **brand name (right) · logo (center) · invoice meta (left)**
- Compact invoice **preview** aligned with PDF (mobile keeps dense document layout)

### Pricing & market
- Live gold price from **Viragold** (Toman→Rial, store on change for history/charts)
- Buy/sell kill switches split; closed-market badges moved below prices on mobile dashboard
- Smart-trade order-type cards improved for mobile touch targets

### Treasury, finance & ops
- Treasury & audit phases (vault, coverage, journal, debtors/creditors, CSV)
- One-step deposit & one-step Rial withdrawal completion with receipts
- Gold withdrawal two-step pickup flow
- Reygiri assay API in panels
- Image compress (frontend + backend) for uploads
- Support Hub + admin setup checklist

### Deploy notes (production)
Typical path: `/var/www/gold-trader` with `docker-compose.production.yml`.

```bash
# Frontend or template/UI change
git pull
docker compose -f docker-compose.production.yml build --pull=false frontend backend
docker compose -f docker-compose.production.yml up -d frontend backend
docker compose -f docker-compose.production.yml restart nginx

# Backend-only (volume-mounted code) — often enough:
docker compose -f docker-compose.production.yml restart backend
```

Migrations when models change:

```bash
docker compose -f docker-compose.production.yml exec backend python manage.py migrate
```

### Go-live financial reset (keep users)

Safe management command to wipe test trades/deposits/withdrawals/treasury journal and zero wallets **without deleting users**, bank cards, settings, or gold prices.

```bash
# 1) Backup DB first (pg_dump)
# 2) Preview counts only
docker compose -f docker-compose.production.yml exec backend \
  python manage.py go_live_reset --dry-run

# 3) Execute (exact confirm phrase required)
docker compose -f docker-compose.production.yml exec backend \
  python manage.py go_live_reset --confirm GO_LIVE_RESET
```

Optional flags: `--clear-push`, `--keep-tokens`, `--clear-sessions`.

After reset: set real company vault balance in admin, verify active gold price, test OTP login.

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
3. Admin **registers in-person delivery** after handover → **Delivered** + delivery invoice PDF when applicable.
4. SMS on approve and on delivery complete.

### Manual invoice (admin → customer)
1. Admin creates manual buy/sell for a phone number (customer created/verified if needed).
2. Settlement: wallet or out-of-system; optional physical delivery document fields.
3. Customer logs in with OTP → completes KYC profile if incomplete → uses dashboard.

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
| Push | Web Push (VAPID) + Service Worker |
| Live price | Viragold API (optional) |
| PDF | WeasyPrint (A5 Persian invoices) |
| Deploy | Docker Compose, Nginx, Gunicorn, WhiteNoise |

---

## Project Structure

```
gold-trader/
├── backend/
│   ├── accounts/       # Auth, users, OTP, profile, image upload
│   ├── wallet/         # Wallet, deposits, withdrawals, bank cards, gold delivery PDF
│   ├── trades/         # Trades, pricing, Viragold, smart orders, manual invoices
│   ├── settings/       # System settings, invoice issuer/stamp, Support Hub, pages
│   ├── notifications/  # In-app + Web Push subscriptions
│   └── config/         # Django & Celery config
├── frontend/
│   ├── app/            # dashboard, adminpanel, auth, contact, about
│   ├── components/
│   │   ├── support/    # SupportFab, SupportHubPanel
│   │   ├── admin/      # Manual invoices, SupportSettings, InvoiceIssuerSettings
│   │   ├── PWA/        # InstallPrompt, NotificationEnableModal, SW registration
│   │   └── ui/         # BirthDateFields, ImageUploadZone, …
│   ├── hooks/          # useSupportInfo, useVisibilityPolling, useGoldPrice, …
│   └── lib/api/        # auth, trades, support, notifications, pages
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
# Edit .env (SECRET_KEY, KAVENEGAR_API_KEY, DB passwords, VAPID_*, VIRAGOLD_*, …)

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
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_ADMIN_EMAIL` | Web Push |
| `VIRAGOLD_API_TOKEN` | Live gold price API (optional) |
| `VIRAGOLD_TOMAN_TO_RIAL` | Toman→Rial multiplier (default `10`) |
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
| POST | `/api/admin/customers/ensure/` | Ensure manual-invoice customer |

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

### Notifications (push)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications/push/vapid-public-key/` | VAPID public key |
| POST | `/api/notifications/push/subscribe/` | Subscribe device |
| POST | `/api/notifications/push/unsubscribe/` | Unsubscribe device |

### Settings & Support
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/support/info/` | Public Support Hub info |
| GET/PUT | `/api/admin/settings/` | System + Support + invoice issuer/stamp |
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
- **Web Push:** Celery task `send_web_push` for device notifications.

---

## PWA & Push

- `manifest.json` for install on mobile/desktop
- Service Worker (`public/sw.js`) with push + notification click handlers
- Browser notification permission + enable modal on panel entry
- Device subscribe/unsubscribe via VAPID

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
- [ ] Keep Kavenegar / Viragold / VAPID keys only in server `.env`
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

پلتفرم معاملات آنلاین طلای آب‌شده با پنل کاربری، پنل مدیریت و API کامل Django. شامل خرید/فروش فوری، **سفارش هوشمند**، کیف پول، واریز/برداشت، **فاکتور دستی**، **خزانه و حسابرسی**، **Support Hub**، Web Push و احراز هویت OTP.

**مخزن:** [github.com/morteza708/gold-trader](https://github.com/morteza708/gold-trader)

---

## ویژگی‌ها

### کاربر
- ورود OTP (کاوه‌نگار) — شامل کاربران ساخته‌شده از فاکتور دستی
- KYC با کارت ملی؛ تاریخ تولد به‌صورت **روز / ماه شمسی / سال**
- کیف پول ریال + طلا (گرم)، موجودی قفل‌شده
- خرید/فروش فوری، سفارش هوشمند، خرید معلق
- واریز یک‌مرحله‌ای؛ برداشت ریال و برداشت طلا (با فاکتور تحویل)
- تاریخچه و **فاکتور PDF یک‌صفحه‌ای A5** فارسی
- اعلان درون‌برنامه‌ای + **اعلان دستگاه (Web Push)** و مودال فعال‌سازی
- Support Hub، راهنمای خوش‌آمدگویی، PWA
- UI راست‌چین، تاریخ شمسی، فرمت عیار/گرم

### پنل مدیریت
- اتاق فرمان: قیمت زنده/دستی، قطع جداگانه خرید/فروش، بنر بازار
- **خزانه و حسابرسی** (پوشش، دفتر، بدهکار/بستانکار، CSV)
- **فاکتور دستی** با تحویل فیزیکی و ساخت خودکار مشتری
- **استعلام ریگیری**
- مالی: واریز، برداشت ریال یک‌مرحله‌ای، برداشت طلا دو مرحله + سند تحویل
- تنظیمات فاکتور: برند، لوگو، **مهر/امضای دیجیتال** (برش خودکار برای PDF)
- Support Hub، صفحات سایت، چک‌لیست راه‌اندازی اولیه

---

## به‌روزرسانی‌های اخیر (مرداد–شهریور ۱۴۰۵ / Aug–Sep 2026)

### احراز هویت و اعلان
- رفع لاگین OTP برای مشتری فاکتور دستی (JWT روی endpoint عمومی، وضعیت پروفایل، رمز غیرقابل‌استفاده)
- فرم تاریخ تولد سه‌تکه؛ مودال فعال‌سازی اعلان در ورود به پنل کاربر و ادمین
- تکمیل Web Push / PWA و OTP autofill

### فاکتور دستی و تحویل
- صدور خرید/فروش حضوری/تلفنی؛ فیلدهای تحویل فیزیکی؛ معادل ۷۵۰ در دفتر؛ فاکتور `GD-####` برای تحویل طلا

### فاکتور PDF و پیش‌نمایش
- فونت یکسان، مهر بزرگ‌تر با پردازش حاشیه، رفع PDF خالی و دو صفحه، سربرگ سه‌ستونه (نام | لوگو وسط | متا)، پیش‌نمایش فشرده هم‌سبک PDF

### قیمت، خزانه و عملیات
- قیمت زنده ویراگلد (تومان→ریال)، خزانه/حسابرسی، ریگیری، فشرده‌سازی تصویر، Support Hub

جزئیات بیشتر در بخش انگلیسی **Recent Updates** همین فایل.

---

## فرآیندهای اصلی

| فرآیند | خلاصه |
|--------|--------|
| **واریز** | کاربر یک فرم → مدیر فیش را می‌بیند → تأیید → شارژ کیف پول |
| **برداشت ریال** | کاربر درخواست → مدیر فیش واریز آپلود + «تأیید واریز و تکمیل» |
| **برداشت طلا** | تأیید → آماده تحویل → تحویل حضوری + فاکتور تحویل |
| **فاکتور دستی** | ادمین صدور → مشتری OTP → تکمیل پروفایل در صورت نیاز |
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

### ریست مالی قبل از شروع رسمی (حفظ کاربران)

```bash
# بک‌آپ DB بگیرید، سپس:
docker compose -f docker-compose.production.yml exec backend \
  python manage.py go_live_reset --dry-run

docker compose -f docker-compose.production.yml exec backend \
  python manage.py go_live_reset --confirm GO_LIVE_RESET
```

کاربران، کارت بانکی، تنظیمات و قیمت طلا حفظ می‌شوند؛ معاملات/واریز/برداشت/دفتر خزانه پاک و کیف پول‌ها صفر می‌شوند.

---

## API (خلاصه)

| بخش | نمونه مسیر |
|-----|-----------|
| احراز هویت | `POST /api/auth/send-otp/` |
| قیمت / معامله | `GET /api/trades/price/` |
| فاکتور PDF | `GET /api/trades/<id>/invoice/` |
| مشتری فاکتور دستی | `POST /api/admin/customers/ensure/` |
| واریز | `POST /api/wallet/deposit/` |
| Web Push | `POST /api/notifications/push/subscribe/` |
| Support Hub | `GET /api/support/info/` |
| تنظیمات ادمین / فاکتور | `GET/PUT /api/admin/settings/` |
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
- همگام‌سازی قیمت از API ویراگلد (در صورت فعال بودن)
- ارسال SMS و Web Push غیرهمزمان

---

## توسعه محلی

```bash
docker compose build && docker compose up -d          # Docker
# یا backend: runserver + frontend: npm run dev         # بدون Docker
```

---

## امنیت

- `DJANGO_DEBUG=False` در production
- کلید Kavenegar / Viragold / VAPID فقط در `.env` سرور
- SSL فعال
- commit نکردن `.env`

---

## مجوز و مشارکت

MIT — [LICENSE](LICENSE)  
Issues: [github.com/morteza708/gold-trader/issues](https://github.com/morteza708/gold-trader/issues)
