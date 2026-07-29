# Single-process image: builds the React client and runs Hono (serving the SPA +
# API) via tsx. Debian trixie's glibc (2.41) satisfies better-sqlite3's published
# prebuilt binary, so no native compile is needed; build tools stay as a fallback.
FROM node:24-trixie-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the source and build the client bundle into dist/client.
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Applies migrations, seeds if empty, then serves SPA + API on one port.
CMD ["npm", "start"]
