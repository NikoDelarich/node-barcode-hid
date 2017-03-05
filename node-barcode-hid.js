var usb = require('usb'),
    events = require('events'),
    async = require('async'),
    HID = require('node-hid'),
    Scanner;

Scanner = function() {
  var that = this,
      status = false;

  events.EventEmitter.call(this);

  this.vendorId = 1334;

  this.buffer = null;

  this.connect = function(usbDesc) {
    async.waterfall([
      function(callback) { /* Find scale */
        var hidDesc = null, hidDevice;

        var devices = HID.devices().filter(function(x) {
          if(usbDesc) {
            // Find HID device
            if( x.vendorId == usbDesc.deviceDescriptor.idVendor &&
                x.productId == usbDesc.deviceDescriptor.idProduct )
            {
              return true;
            }

            return false;
          }
          // Open first device if none was provided
          return x.vendorId === that.vendorId;
        });
        if (devices.length > 0) {
          hidDesc = devices[0];
        } else {
          callback('No USB barcode scanner detected');
          return;
        }

        hidDevice = new HID.HID(hidDesc.path);
        if (hidDevice) {
          callback(null, hidDevice);
        } else {
          callback('Could not open USB device');
        }
      },

      function(device, callback) {
        status = true;

        device.on('error', function(data) {
          status = false;
          that.emit('end');
          callback(data);
        });

        device.on('end', function(data) {
          status = false;
          that.emit('end');
          callback(data);
        });

        device.on('data', function(data) {
          if (data[0] != 2) return; /* Ignore other reports */

          var dataBuffer = data.slice(5, 61);
          var more = !!(data[data.length - 1] & 1);

          /* More available? */
          if(more || that.buffer) {
            if(!that.buffer) that.buffer = Buffer.alloc(0);
            that.buffer = Buffer.concat([that.buffer, dataBuffer]);
            if(more) return;

            dataBuffer = that.buffer;
            that.buffer = null;
          } else if(!more) {
            that.buffer = null;
          }

          that.emit('data', {
            header: Buffer.from(data, 0, 5),
            data:   dataBuffer.toString('ascii')
          });
        });
      }
    ], function(err, result) {
      if (err) {
        // TODO: do something to handle errors
      }
    });
  };

  usb.on('attach', function(device) {
    // A new USB device was attached/powered on, check to see if it's a scale
    if (device.deviceDescriptor.idVendor === that.vendorId) {
      that.connect(device);
      that.emit('online');
    }
  })

  usb.on('detach', function(device) {
    // A device was detached.  See if it's our scale
    if (device.deviceDescriptor.idVendor === that.vendorId) {
      status = false;
      that.emit('offline');
    }
  })

};

Scanner.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = new Scanner();
