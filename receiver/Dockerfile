FROM node:9.10 as build
WORKDIR /app
COPY package* ./
RUN npm install
COPY .babelrc .
COPY test ./test
COPY src ./src
RUN npm run build

FROM node:9.10-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY --from=build /app/dist ./dist
CMD node dist/index.js
