# Dockerfile — production
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
# Use npm ci when lockfile present; fallback safe with legacy peer deps
RUN npm ci --only=production --legacy-peer-deps || npm install --only=production --legacy-peer-deps
COPY . .
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.js"]
