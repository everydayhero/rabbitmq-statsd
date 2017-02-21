var http = require('http');

function RabbitMQ(options) {
  this._host = options.host || 'localhost';
  this._port = parseInt(options.port) || 15672;
  this._user = options.user || 'guest';
  this._password = options.password || 'guest';
  this._debug = options.debug || false;
}

RabbitMQ.prototype.overview = function(callback) {
  this.request({
    path: '/api/overview',
    method: 'GET'
  }, callback);
};

RabbitMQ.prototype.queues = function(callback) {
  this.request({
    path: '/api/queues',
    method: 'GET'
  }, callback);
};

RabbitMQ.prototype.request = function(options, callback) {
  options.host = this._host;
  options.port = this._port;
  options.auth = [this._user, this._password].join(':');

  var log = ['Request ', options.method, ' ', options.host, ':', options.port, options.path, ' - '];

  var req = http.request(options, function(res) {
    var body = '';
    res.on('data', function(chunk) {
      body += chunk;
    });
    res.on('end', function() {
      log.push('received ', body.length, ' bytes');

      if (this._debug) {
        console.log(log.join(''));
      }

      try {
        callback(null, JSON.parse(body));
      } catch(err) {
        callback(err, null);
      }
    });
  });

  req.on('error', function(err) {
    log.push(err);
    console.error(log.join(''));
    callback(err, null);
  });
  req.end();
};

module.exports = RabbitMQ;
