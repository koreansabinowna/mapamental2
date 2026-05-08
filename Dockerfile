# ── Estágio 1: Build do frontend ──────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# ── Estágio 2: Servidor Node.js ───────────────────────────
FROM node:20-alpine

WORKDIR /app

# Instala dependências do backend
COPY package*.json ./
RUN npm install --production

# Copia arquivos do backend
COPY server.js .
COPY schema.sql .

# Copia o build do frontend para a pasta public
RUN mkdir -p public
COPY --from=frontend-build /frontend/dist ./public

EXPOSE 3001
CMD ["node", "server.js"]
