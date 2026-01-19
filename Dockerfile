# Usar Node.js 18 como base
FROM node:18-bullseye

# Instalar dependencias del sistema para Chromium
RUN apt-get update && apt-get install -y \
    # Dependencias básicas de Chromium
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    # Dependencias adicionales
    fonts-liberation \
    libappindicator3-1 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    # Limpieza
    && rm -rf /var/lib/apt/lists/*

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de Node.js
RUN npm ci --omit=dev

# Instalar Chromium de Playwright con todas las dependencias
RUN npx playwright install chromium --with-deps

# Copiar el resto del código
COPY . .

# Build de Next.js
RUN npm run build

# Exponer puerto (Railway lo asigna dinámicamente, pero por defecto usamos 3000)
EXPOSE 3000

# Variables de entorno para Playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_ENV=production

# Comando para iniciar la aplicación
CMD ["npm", "start"]
