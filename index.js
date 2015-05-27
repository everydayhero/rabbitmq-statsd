var RabbitMQStats = require('./rabbitmq_stats');

var rabbitmqStats = new RabbitMQStats({
  rabbitmq_user: process.env.RABBITMQ_USER,
  rabbitmq_password: process.env.RABBITMQ_PASSWORD,
  rabbitmq_host: process.env.RABBITMQ_HOST,
  rabbitmq_port: process.env.RABBITMQ_PORT,
  statsd_host: process.env.STATSD_HOST,
  statsd_port: process.env.STATSD_PORT,
  prefix: process.env.PREFIX,
  interval: process.env.INTERVAL
});

rabbitmqStats.watch(function(err) {
  if (err) {
    console.error(err);
  }
});

