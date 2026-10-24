const fs = require('fs');
const path = require('path');

// Release the "a test run is in progress" lock taken in globalSetup.
module.exports = async () => {
  fs.rmSync(path.join(__dirname, '.jest-running'), { force: true });
};
