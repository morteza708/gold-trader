# 🔧 راهنمای Setup سرور - حل مشکلات رایج

## مشکل: Permission denied (publickey) در Git Clone

### راه‌حل 1: استفاده از HTTPS (ساده‌تر) ⭐

```bash
# در سرور
cd /var/www
rm -rf gold-trading  # اگر قبلاً ایجاد شده

# Clone با HTTPS
git clone https://github.com/morteza708/gold-trader.git gold-trading
cd gold-trading
```

**نکته:** اگر repository private است، باید username و password (یا token) وارد کنید.

---

### راه‌حل 2: تنظیم SSH Key (برای استفاده از SSH)

#### گام 1: ایجاد SSH Key در سرور

```bash
# در سرور
ssh-keygen -t ed25519 -C "server@irangoldtrader.ir"
# Enter را بزنید (یا passphrase بگذارید)
```

#### گام 2: نمایش Public Key

```bash
cat ~/.ssh/id_ed25519.pub
```

#### گام 3: اضافه کردن به GitHub

1. به GitHub بروید: https://github.com/settings/keys
2. روی **"New SSH key"** کلیک کنید
3. Title: `Server - irangoldtrader.ir`
4. Key: محتوای `~/.ssh/id_ed25519.pub` را paste کنید
5. **"Add SSH key"** را بزنید

#### گام 4: تست اتصال

```bash
ssh -T git@github.com
# باید پیام موفقیت ببینید
```

#### گام 5: Clone با SSH

```bash
cd /var/www
git clone git@github.com:morteza708/gold-trader.git gold-trading
```

---

## اگر Repository Private است

### استفاده از Personal Access Token

1. به GitHub بروید: https://github.com/settings/tokens
2. **"Generate new token (classic)"**
3. Scopes: `repo` را انتخاب کنید
4. Token را کپی کنید

#### استفاده از Token:

```bash
# Clone با HTTPS و استفاده از token
git clone https://YOUR_TOKEN@github.com/morteza708/gold-trader.git gold-trading

# یا بعد از clone، برای pull:
git config credential.helper store
# در اولین pull، username و token را وارد کنید
```

---

## راه‌حل سریع (الان)

برای ادامه سریع، از HTTPS استفاده کنید:

```bash
cd /var/www
git clone https://github.com/morteza708/gold-trader.git gold-trading
cd gold-trading
```

اگر repository private است و از شما username/password خواست:
- Username: `morteza708`
- Password: Personal Access Token (نه password واقعی)

