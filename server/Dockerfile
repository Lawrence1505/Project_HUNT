# HEAL API server
FROM node:20-alpine

WORKDIR /app

# Install prod deps first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "index.js"]
