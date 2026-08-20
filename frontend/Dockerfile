# Frontend Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY scripts/ ./scripts/

# Install dependencies
RUN npm config set registry https://mirror-npm.runflare.com && \
    npm install --legacy-peer-deps --timeout=600000 --maxsockets=1 || \
    (npm config set registry https://registry.npmjs.org && npm install --legacy-peer-deps --timeout=600000 --maxsockets=1)

COPY . .

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# NEXT_PUBLIC_* must be available at build time (baked into the client bundle)
ARG NEXT_PUBLIC_API_URL=https://opalbox.ir/api
ARG NEXT_PUBLIC_SITE_URL=https://opalbox.ir
ARG NEXT_PUBLIC_BRAND_NAME=اپال‌باکس
ARG NEXT_PUBLIC_BRAND_NAME_EN=OpalBox
ARG NEXT_PUBLIC_BRAND_COMPANY_NAME=شرکت اپال‌باکس
ARG NEXT_PUBLIC_BRAND_TAGLINE=سامانه امن خرید و فروش طلای آب‌شده
ARG NEXT_PUBLIC_BRAND_LOGO=/OpalBox.png
ARG NEXT_PUBLIC_BRAND_LOGO_MARK=/OpalBox-mark.png
ARG NEXT_PUBLIC_THEME_COLOR=#D4AF37

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_BRAND_NAME=${NEXT_PUBLIC_BRAND_NAME}
ENV NEXT_PUBLIC_BRAND_NAME_EN=${NEXT_PUBLIC_BRAND_NAME_EN}
ENV NEXT_PUBLIC_BRAND_COMPANY_NAME=${NEXT_PUBLIC_BRAND_COMPANY_NAME}
ENV NEXT_PUBLIC_BRAND_TAGLINE=${NEXT_PUBLIC_BRAND_TAGLINE}
ENV NEXT_PUBLIC_BRAND_LOGO=${NEXT_PUBLIC_BRAND_LOGO}
ENV NEXT_PUBLIC_BRAND_LOGO_MARK=${NEXT_PUBLIC_BRAND_LOGO_MARK}
ENV NEXT_PUBLIC_THEME_COLOR=${NEXT_PUBLIC_THEME_COLOR}

RUN npm run build

ENV NODE_ENV=production

RUN cp -r .next/static .next/standalone/.next/static && \
    cp -r public .next/standalone/public

WORKDIR /app/.next/standalone
CMD ["node", "server.js"]
