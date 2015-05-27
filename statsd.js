var dgram = require('dgram');

function StatsD(options) {
  this._prefix = options.prefix;
  this._host = options.host || 'localhost';
  this._port = options.port || 8125;

  this._socket = dgram.createSocket('udp4');
}

StatsD.prototype.send = function(key, value, type, callback) {
  var data = [key, ':', value, '|', type].join('');
  var buffer = new Buffer(data);

  this._socket.send(buffer, 0, buffer.length, this._port, this._host, callback);
};

StatsD.prototype.close = function() {
  this._socket.close();
};

StatsD.prototype.gauge = function(key, value, callback) {
  this.send(key, value, 'g', callback);
};

module.exports = StatsD;

