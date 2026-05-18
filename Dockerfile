# Bookmaker — Express + Puppeteer. Uses the distro Chromium instead of
# Puppeteer's bundled download so the image stays small and the binary
# matches the installed system libraries.
FROM node:22-bookworm-slim

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    PORT=3000

# chromium + the libraries it needs at runtime, plus Noto CJK as a
# fallback if Google Fonts are unreachable during render.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      fonts-noto-cjk \
      ca-certificates \
      dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# server.js creates ./uploads at startup and writes there per request,
# so the app directory must be writable by the non-root runtime user.
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node
EXPOSE 3000

# dumb-init forwards SIGTERM so the SIGINT/SIGTERM shutdown handler in
# server.js runs and closes the shared Puppeteer browser cleanly.
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
