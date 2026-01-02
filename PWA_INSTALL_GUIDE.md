# راهنمای نصب PWA در مرورگرهای مختلف

## مشکل: Install Prompt در مرورگرهای مختلف نمایش داده نمی‌شود

### علت‌های احتمالی:

#### 1. **Safari/iOS**
- Safari از `beforeinstallprompt` event پشتیبانی **نمی‌کند**
- iOS Safari از PWA به صورت محدود پشتیبانی می‌کند
- کاربر باید از دکمه "Add to Home Screen" استفاده کند
- دستورالعمل: Share (اشتراک‌گذاری) → "Add to Home Screen" → "Add"

#### 2. **Firefox**
- Firefox از `beforeinstallprompt` event پشتیبانی **نمی‌کند**
- Firefox از روش دیگری برای نصب PWA استفاده می‌کند
- کاربر باید به صورت دستی از منوی Firefox نصب کند
- دستورالعمل: منوی Firefox (☰) → "نصب" یا "Install"

#### 3. **Chrome/Edge**
- `beforeinstallprompt` event فقط در شرایط خاص trigger می‌شود:
  - ✅ Service Worker باید فعال باشد
  - ✅ Manifest.json باید معتبر باشد
  - ✅ باید HTTPS باشد (یا localhost)
  - ✅ کاربر نباید قبلاً prompt را dismiss کرده باشد
  - ✅ اپ نباید قبلاً نصب شده باشد

### راه‌حل‌ها:

#### برای Chrome:
1. **بررسی Service Worker:**
   - DevTools → Application → Service Workers
   - باید "activated and is running" باشد

2. **بررسی Manifest:**
   - DevTools → Application → Manifest
   - باید همه فیلدها معتبر باشند

3. **بررسی Console:**
   - پیام‌های debug را بررسی کنید
   - باید "beforeinstallprompt event received" را ببینید

4. **Clear Storage:**
   - DevTools → Application → Storage → Clear site data
   - این localStorage dismiss را پاک می‌کند

#### برای Safari/iOS:
- Safari از `beforeinstallprompt` پشتیبانی نمی‌کند
- کاربر باید:
  1. روی دکمه Share (اشتراک‌گذاری) در پایین صفحه کلیک کند
  2. گزینه "Add to Home Screen" (افزودن به صفحه اصلی) را انتخاب کند
  3. روی "Add" (افزودن) کلیک کند

#### برای Firefox:
- Firefox از `beforeinstallprompt` پشتیبانی نمی‌کند
- کاربر باید:
  1. روی منوی Firefox (☰) کلیک کند
  2. گزینه "نصب" یا "Install" را انتخاب کند
  3. یا از آیکون نصب در نوار آدرس استفاده کند

### تست:

1. **Chrome/Edge:**
   ```javascript
   // در Console اجرا کنید:
   window.addEventListener('beforeinstallprompt', (e) => {
     console.log('beforeinstallprompt fired!', e);
   });
   ```

2. **Safari/iOS:**
   - دکمه Share → "Add to Home Screen"
   - یا از منوی Safari → "Add to Home Screen"

3. **Firefox:**
   - منوی Firefox → نصب (Install)
   - یا آیکون نصب در نوار آدرس

### Debugging:

کد فعلی شامل console.log های مفیدی است:
- "beforeinstallprompt event received" - event trigger شد
- "Service Worker is ready" - Service Worker فعال است
- "Manifest link found" - manifest پیدا شد
- "PWA Requirements check" - بررسی شرایط PWA

### نکات مهم:

1. **HTTPS ضروری است** (به جز localhost)
2. **Service Worker باید فعال باشد**
3. **Manifest باید معتبر باشد**
4. **کاربر نباید قبلاً dismiss کرده باشد** (7 روز)
5. **Firefox از beforeinstallprompt پشتیبانی نمی‌کند**
6. **Safari/iOS از beforeinstallprompt پشتیبانی نمی‌کند**
7. **iOS نیاز به دستورالعمل دستی برای نصب دارد**

### پشتیبانی مرورگرها:

| مرورگر | beforeinstallprompt | روش نصب |
|--------|-------------------|---------|
| Chrome | ✅ پشتیبانی می‌کند | خودکار (prompt) |
| Edge | ✅ پشتیبانی می‌کند | خودکار (prompt) |
| Firefox | ❌ پشتیبانی نمی‌کند | دستی (منوی Firefox) |
| Safari | ❌ پشتیبانی نمی‌کند | دستی (Add to Home Screen) |
| iOS Safari | ❌ پشتیبانی نمی‌کند | دستی (Add to Home Screen) |

