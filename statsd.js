var dgram = require('dgram');

function StatsD(options) {
  this._stack = [];
  this._host = options.host || 'localhost';
  this._port = options.port || 8125;
  this._debug = options.debug;

  this._socket = dgram.createSocket('udp4');
}

StatsD.prototype.send = function(data, callback) {
  var buffer = new Buffer(data);

  this._socket.send(buffer, 0, buffer.length, this._port, this._host, function(err, bytes) {
    var loglevel = err ? 'error' : 'log';

    if (err || this._debug) {
      console[loglevel](['Sending data to ', this._host, ':', this._port, ' - ', data].join(''));
    }

    if (callback) {
      callback(err, bytes);
    }
  }.bind(this));
};

StatsD.prototype.begin = function() {
  this._stack.push([]);
};

StatsD.prototype.end = function() {
  var buffer = this._stack.pop();
  this.append.apply(this, buffer);
};

StatsD.prototype.append = function() {
  var buffer = this._stack[this._stack.length - 1] || [];
  var isStackEmpty = !this._stack.length;

  buffer.push.apply(buffer, arguments);

  if (buffer.length && isStackEmpty) {
    this.send(buffer.join('\n'));
  }
};

StatsD.prototype.close = function() {
  this.end();
  this._socket.close();
};

StatsD.prototype.metric = function(key, value, type) {
  var normalizedKey = key.toString().replace(/\W+/g, '.');
  var data = [normalizedKey, ':', value, '|', type].join('');

  if (typeof(value) !== 'undefined' && value !== null) {
    this.append(data);
  } else if (this._debug) {
    console.warn('Ignoring', key, '; value is empty');
  }
};

StatsD.prototype.gauge = function(key, value) {
  this.metric(key, value, 'g');
};

module.exports = StatsD;

