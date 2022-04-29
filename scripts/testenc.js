const Gun = require('gun/gun');
const SEA = require('gun/sea');

const gun = Gun(['http://localhost:8765/gun']);

const createUser = pair => {
  gun.user().create(pair, ack => {
    console.log(ack);
    // if (err) {
    //   console.error(err);
    // } else {
    //   console.log(pub);

    //   authUser(pair);
    // }
  });
};

const authUser = pair => {
  gun.user().auth(pair, ack => {
    console.log(ack);
  });
};

async function main() {
  // const appPair = await SEA.pair();
  const userPair = await SEA.pair();
  // console.log(userPair);

  createUser(userPair);
  // console.log(user);
  // const encrypted = await SEA.encrypt(JSON.stringify(userPair), appPair);
  // console.log(encrypted);
  // console.log(typeof encrypted);

  // const decrypted = await SEA.decrypt(encrypted, appPair);
  // console.log(decrypted);
}

main();
