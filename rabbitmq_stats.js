var RabbitMQ = require('./rabbitmq');
var StatsD = require('./statsd');

function RabbitMQStats(options) {
  this._rabbitmq = new RabbitMQ({
    host: options.rabbitmq_host,
    port: options.rabbitmq_port,
    user: options.rabbitmq_user,
    password: options.rabbitmq_password
  });
  this._statsd = new StatsD({
    host: options.statsd_host,
    port: options.statsd_port
  });
  this._interval = options.interval || 10;
  this._prefix = options.prefix || require('os').hostname();
}

RabbitMQStats.prototype.send = function(data, prefix) {
  if (Array.isArray(data)) {
    data.forEach(function(item) {
      this.send(item, prefix);
    }.bind(this));
  } else if (typeof(data) === 'object') {
    Object.keys(data).forEach(function(key) {
      var value = data[key];
      var prefixedKey = compact(prefix, key).join('.');

      if (Array.isArray(value) || typeof(value) === 'object') {
        this.send(value, prefixedKey);
      } else {
        this._statsd.gauge(prefixedKey, value);
      }
    }.bind(this));
  } else {
    console.warn('Cannot send data: ' + String(data));
  }
};

RabbitMQStats.prototype.sendOverview = function(callback) {
  this._rabbitmq.overview(function(err, data) {
    if (err) {
      return callback(err, null);
    }

    var payload = data.object_totals;
    console.log('Sending rabbitmq overview data');
    this.send(payload, this._prefix);
    callback(null, payload);
  }.bind(this));
};

RabbitMQStats.prototype.sendQueues = function(callback) {
  this._rabbitmq.queues(function(err, data) {
    if (err) {
      return callback(err, null);
    }

    if (!Array.isArray(data)) {
      data = [data];
    }

    var payload = data.map(function(item) {
      var newItem = {
        active_consumers: item.active_consumers,
        consumers: item.consumers,
        memory: item.memory,
        messages: item.messages,
        messages_ready: item.messages_ready,
        messages_unacknowledged: item.messages_unacknowledged
      };

      if (item.backing_queue_status) {
        newItem.avg_egress_rate = item.backing_queue_status.avg_egress_rate;
        newItem.avg_ingress_rate = item.backing_queue_status.payload.avg_ingress_rate;
      }

      if (item.memory_stats) {
        var ms = item.memory_stats;
        newItem.ack_rate = ms.ack_details.rate;
        newItem.deliver_rate = ms.deliver_details.rate;
        newItem.deliver_get_rate = ms.deliver_get_details.rate;
        newItem.publish_rate = ms.publish_details.rate;
      }

      var temp = {};
      temp[item.name] = newItem;
      return newItem;
    });

    console.log('Sending rabbitmq queues data');
    this.send(payload);
    callback(null, payload);
  }.bind(this));
};

RabbitMQStats.prototype.sendAll = function(callback) {
  var methods = ['sendOverview', 'sendQueues'];
  var err, payload;

  function process() {
    var method = methods.shift();
    if (!err && method) {
      this[method](function(_err, _payload) {
        err = _err;
        payload = _payload;
        process.call(this);
      }.bind(this));
    } else {
      callback(err, payload);
    }
  }

  process.call(this);
};

RabbitMQStats.prototype.watch = function(callback) {
  this.sendAll(function(err, payload) {
    callback(err, payload);

    setTimeout(function() {
      this.watch(callback);
    }.bind(this), this._interval * 1000);
  }.bind(this));
};

function compact() {
  var array = [].slice.call(arguments);
  return array.filter(function(i) { return !!i });
}

module.exports = RabbitMQStats;

