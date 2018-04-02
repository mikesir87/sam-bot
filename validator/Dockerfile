FROM node:9.10 as build
WORKDIR /app
COPY package.json .
RUN npm install
COPY .babelrc .
COPY src ./src
RUN npm run build

FROM node:9.10-alpine
RUN apk add --no-cache git openssh-client
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY --from=build /app/dist ./dist
CMD node dist/index.js