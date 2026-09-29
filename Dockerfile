FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY src ./src
COPY config ./config

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

EXPOSE 8080

CMD ["npm", "run", "serve"]
