# Frontend Dockerfile
FROM node:20-alpine

# Set work directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy scripts directory (needed for postinstall)
COPY scripts/ ./scripts/

# Install dependencies
RUN npm ci

# Copy project files
COPY . .

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start Next.js in development mode
# برای production، می‌توانید از multi-stage build استفاده کنید
CMD ["npm", "run", "dev"]

