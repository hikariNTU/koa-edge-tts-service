FROM node:22-alpine

RUN npm ci

CMD ["node index.mjs"]
