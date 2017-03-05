var scanner = require('./node-barcode-hid');

scanner.connect();

scanner.on('online', function() {
  console.log('scanner was connected/powered on');
});

scanner.on('offline', function() {
  console.log('scanner was disconnected/powered off');
});

scanner.on('data', function(obj) {
  console.log("Scanned code: " + obj.data);
});

scanner.on('end', function(obj) {
  console.log("Error or scanner lost");
});
