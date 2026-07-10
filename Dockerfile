FROM node:24-bookworm-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY next.config.mjs tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:24-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATA_DIR=/data

COPY package*.json ./
RUN npm ci --omit=dev \
  && npx playwright install --with-deps chromium \
  && npm cache clean --force

COPY --from=build /app/.next ./.next
COPY --from=build /app/next.config.mjs ./next.config.mjs

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3000
CMD ["npm", "start"]
