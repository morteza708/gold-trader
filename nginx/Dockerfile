FROM nginx:1.25-alpine

# حذف فایل پیش‌فرض nginx
RUN rm /etc/nginx/conf.d/default.conf

# کپی فایل تنظیمات nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ایجاد پوشه‌های لازم برای static و media files
RUN mkdir -p /var/www/staticfiles /var/www/media

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

