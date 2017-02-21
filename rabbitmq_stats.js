var RabbitMQ = require('./rabbitmq');
var StatsD = require('./statsd');

function RabbitMQStats(options) {
  this._rabbitmq = new RabbitMQ({
    host: options.rabbitmq_host,
    port: options.rabbitmq_port,
    user: options.rabbitmq_user,
    password: options.rabbitmq_password,
    debug: options.debug
  });
  this._statsd = new StatsD({
    host: options.statsd_host,
    port: options.statsd_port,
    debug: options.debug
  });
  this._interval = options.interval || 10;
  this._prefix = options.prefix;
  this._debug = options.debug || false;

}

RabbitMQStats.prototype.send = function(data, prefix) {
  this._statsd.begin();

  if (Array.isArray(data)) {
    data.forEach(function(item) {
      this.send(item, prefix);
    }.bind(this));
  } else if (typeof(data) === 'object') {
    Object.keys(data).forEach(function(key) {
      var value = data[key];
      var prefixedKey = prefix ? [prefix, key].join('.') : key;

      if (Array.isArray(value) || typeof(value) === 'object') {
        this.send(value, prefixedKey);
      } else {
        this._statsd.gauge(prefixedKey, value);
      }
    }.bind(this));
  } else {
    console.warn('Cannot send data: ' + String(data));
  }

  this._statsd.end();
};

RabbitMQStats.prototype.sendOverview = function(callback) {
  this._rabbitmq.overview(function(err, data) {
    if (err) {
      return callback(err, null);
    }

    var payload = data.object_totals;

    if (this._debug) {
      console.log('Sending rabbitmq overview data');
    }

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

      var bqs = item.backing_queue_status;
      if (bqs) {
        newItem.avg_egress_rate = bqs.avg_egress_rate;
        newItem.avg_ingress_rate = bqs.avg_ingress_rate;
      }

      var ms = item.memory_stats;
      if (ms) {
        newItem.ack_rate = ms.ack_details.rate;
        newItem.deliver_rate = ms.deliver_details.rate;
        newItem.deliver_get_rate = ms.deliver_get_details.rate;
        newItem.publish_rate = ms.publish_details.rate;
      }

      var temp = {};
      temp[item.name] = newItem;
      return temp;
    });

    if (this._debug) {
      console.log('Sending rabbitmq queues data');
    }

    this.send(payload, this._prefix);
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

module.exports = RabbitMQStats;
