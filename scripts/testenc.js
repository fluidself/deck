const Gun = require('gun/gun');
const SEA = require('gun/sea');
const _isArrayLike = require('lodash/isArrayLike');
const _map = require('lodash/map');
const _omit = require('lodash/omit');
const _zipObject = require('lodash/zipObject');
const { v4: uuidv4 } = require('uuid');

const gun = Gun(['http://localhost:8765/gun']);

const createUser = pair => {
  gun.user().create(pair, ack => {
    console.log(ack);
  });
};

const authUser = pair => {
  gun.user().auth(pair, ack => {
    console.log(ack);
  });
};

async function encrypt(data, opts) {
  return await _crypt(data, _encryptValue, { ...opts });
}

async function decrypt(data, opts) {
  return await _crypt(data, _decryptValue, { ...opts });
}

async function _crypt(data, map, opts) {
  let { pair, secret = '' } = opts;
  if (!pair && !secret) {
    throw new Error('Either pair or secret is required');
  }
  if (!secret) {
    secret = pair;
  }
  return await _mapDeep(data, map, { secret });
}

async function _mapDeep(data, map, opts) {
  switch (typeof data) {
    case 'undefined':
      return undefined;
    case 'object':
      if (_isArrayLike(data)) {
        // Array
        return Promise.all(_map(data, x => _mapDeep(x, map, opts)));
      }
      // Object
      let meta = data._;
      if (meta) {
        // Remove meta
        data = _omit(data, '_');
      }
      let keys = Object.keys(data);
      let rawValues = Object.values(data);
      let values = await Promise.all(rawValues.map(x => _mapDeep(x, map, opts)));
      let result = _zipObject(keys, values);
      if (meta) {
        result = { _: meta, ...result };
      }
      return result;
    default:
      return map(data, opts);
  }
}

const _encryptValue = async (value, { secret }) => {
  if (value.startsWith('SEA{')) {
    // Already encrypted
    return value;
  }
  let data = await SEA.encrypt(value, secret);
  if (typeof data === 'undefined') {
    throw new Error('Could not encrypt');
  }
  return data;
};

const _decryptValue = async (data, { secret }) => {
  if (!data.startsWith('SEA{')) {
    // No decryption necessary
    return data;
  }
  let msg = data;
  let value = await SEA.decrypt(msg, secret);
  if (typeof value === 'undefined') {
    throw new Error('Could not decrypt');
  }
  return value;
};

async function main() {
  const pair = await SEA.pair();

  const note = {
    id: uuidv4(),
    title: 'note title',
    content: [{ id: uuidv4(), type: 'paragraph', children: [{ text: '' }] }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  console.log('--- note ---');
  console.log(note);

  const encrypted = await encrypt(note, { pair });
  console.log('--- encrypted ---');
  console.log(encrypted);

  const decrypted = await decrypt(encrypted, { pair });
  console.log('--- decrypted ---');
  console.log(decrypted);
}

main();
