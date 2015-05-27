var dgram = require('dgram');

function StatsD(options) {
  this._prefix = options.prefix;
  this._host = options.host || 'localhost';
  this._port = options.port || 8125;

  this._socket = dgram.createSocket('udp4');
}

StatsD.prototype.send = function(key, value, type, callback) {
  var normalizedKey = key.toString().replace(/\W+/, '.');
  var data = [normalizedKey, ':', value, '|', type].join('');
  var buffer = new Buffer(data);

  this._socket.send(buffer, 0, buffer.length, this._port, this._host, function(err, bytes) {
    var loglevel = err ? 'error' : 'log';
    console[loglevel](['Sending data to ', this._host, ':', this._port, ' - ', data].join(''));

    if (callback) {
      callback(err, bytes);
    }
  });
};

StatsD.prototype.close = function() {
  this._socket.close();
};

StatsD.prototype.gauge = function(key, value, callback) {
  this.send(key, value, 'g', callback);
};

module.exports = StatsD;

