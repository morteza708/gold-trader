# Frontend Dockerfile
FROM node:20-alpine

# Set work directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy scripts directory (needed for postinstall)
COPY scripts/ ./scripts/

# Install dependencies (با استفاده از npm registry ایرانی)
RUN npm config set registry https://mirror-npm.runflare.com && \
    npm install --legacy-peer-deps --timeout=600000 --maxsockets=1 || \
    (npm config set registry https://registry.npmjs.org && npm install --legacy-peer-deps --timeout=600000 --maxsockets=1)

# Copy project files
COPY . .

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Build and start Next.js in production mode
RUN npm run build

# Set production environment
ENV NODE_ENV=production

# Start Next.js in production mode
CMD ["npm", "start"]

