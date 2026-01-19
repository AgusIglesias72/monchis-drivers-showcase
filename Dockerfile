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

# Instalar TODAS las dependencias (incluyendo devDependencies para el build)
RUN npm ci

# Copiar el resto del código
COPY . .

# ARG para recibir la variable durante el build
ARG NEXT_PUBLIC_DISABLE_CLERK=true

# Build de Next.js (requiere devDependencies como Tailwind)
# La variable ARG estará disponible durante el build
RUN NEXT_PUBLIC_DISABLE_CLERK=${NEXT_PUBLIC_DISABLE_CLERK} npm run build

# Limpiar devDependencies después del build para reducir tamaño
RUN npm prune --production

# Reinstalar solo Playwright después del prune (necesario en runtime)
RUN npm install playwright@1.49.1 && npx playwright install chromium --with-deps

# Exponer puerto (Railway lo asigna dinámicamente, pero por defecto usamos 3000)
EXPOSE 3000

# Variables de entorno para Playwright y Clerk
# No configurar PLAYWRIGHT_BROWSERS_PATH para usar la ruta por defecto
ENV NODE_ENV=production
ENV NEXT_PUBLIC_DISABLE_CLERK=true

# Comando para iniciar la aplicación
CMD ["npm", "start"]
