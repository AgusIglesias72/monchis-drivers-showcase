# Dockerfile para WhatsApp Bot (whatsapp-web.js + Puppeteer)
# Puppeteer baja su propio Chromium (matchea con la versión de la librería).
# Solo instalamos las libs del sistema que ese Chromium necesita para correr.
FROM node:20-bookworm-slim

# Dependencias del sistema requeridas por el Chromium de Puppeteer.
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc-s1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    wget \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar deps. El postinstall de puppeteer descarga su Chromium a
# /root/.cache/puppeteer dentro de la imagen.
COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
