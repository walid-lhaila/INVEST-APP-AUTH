FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN rm -f .env

RUN npm run build

EXPOSE 3003

CMD ["npm", "run", "start"]
