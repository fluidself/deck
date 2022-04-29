const SEA = require('gun/sea');

SEA.pair().then(pair => {
  console.log('\nThis is your secret app key pair:');
  console.log(`APP_ACCESS_KEY_PAIR='${JSON.stringify(pair)}'\n`);
});
