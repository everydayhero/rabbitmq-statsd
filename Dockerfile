FROM node

RUN mkdir -p /usr/local/rabbitmq-stats

COPY . /usr/local/rabbitmq-stats/
WORKDIR /usr/local/rabbitmq-stats

RUN npm update

CMD ["node", "index.js"]

