FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM deps AS builder

COPY tsconfig.json ./
COPY tsconfig-paths-bootstrap.js ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/tsconfig-paths-bootstrap.js ./tsconfig-paths-bootstrap.js
COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 5000

CMD ["npm", "run", "start"]
