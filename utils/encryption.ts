// @ts-ignore
import LitJsSdk from 'lit-js-sdk';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import type { ISEAPair } from 'gun/types/sea';
import SEA from 'gun/sea';
import _isArrayLike from 'lodash/isArrayLike';
import _map from 'lodash/map';
import _omit from 'lodash/omit';
import _zipObject from 'lodash/zipObject';
import type { AuthSig } from 'types/lit';

// SEA encryption / decryption
interface CryptOptionsBase {
  pair?: ISEAPair;
  secret?: any;
}

type CryptOptions = CryptOptionsBase & (Required<Pick<CryptOptionsBase, 'pair'>> | Required<Pick<CryptOptionsBase, 'secret'>>);

export type EncryptOptions = CryptOptionsBase & CryptOptions;
export type DecryptOptions = CryptOptionsBase & CryptOptions;

/**
 * Encrypt a value, array or object. The encrypted data
 * retains topology and can only be decrypted by the current user.
 *
 * Keys are not encrypted.
 *
 * If the value or nested value is already encrypted, does not re-encrypt
 * that value.
 *
 * @param value
 * @param opts
 */
export async function encrypt<T>(data: T, opts: EncryptOptions): Promise<T> {
  return await _crypt(data, _encryptValue, { ...opts });
}

/**
 * Decrypt a value, array or object. The decrypted data
 * retains topology and can only be decrypted by the current user.
 *
 * Keys are not encrypted.
 *
 * If the value or nested value is already encrypted, does not re-encrypt
 * that value.
 *
 * @param value
 * @param opts
 */
export async function decrypt<T>(data: T, opts: DecryptOptions): Promise<T> {
  return await _crypt(data, _decryptValue, { ...opts });
}

async function _crypt(data: any, map: any, opts: CryptOptions): Promise<any> {
  let { pair, secret = '' } = opts;
  if (!pair && !secret) {
    throw new Error('Either pair or secret is required');
  }
  if (!secret) {
    secret = pair;
  }
  return await _mapDeep(data, map, { secret });
}

// TODO: Also reuse elsewhere?
/**
 * Traverse data and map.
 * @param data
 * @param map
 * @param opts
 */
async function _mapDeep(
  data: any,
  map: any,
  opts: {
    secret: any;
  },
): Promise<any> {
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

const _encryptValue = async (
  value: string,
  {
    secret,
  }: {
    secret: any;
  },
): Promise<string> => {
  if (value.startsWith('SEA{')) {
    // Already encrypted
    return value;
  }
  let data: string | undefined = await SEA.encrypt(value, secret);
  if (typeof data === 'undefined') {
    throw _getSEAError('Could not encrypt');
  }
  return data;
};

const _decryptValue = async (
  data: string,
  {
    secret,
  }: {
    secret: any;
  },
): Promise<string> => {
  if (!data.startsWith('SEA{')) {
    // No decryption necessary
    return data;
  }
  let msg: any = data;
  let value: any = await SEA.decrypt(msg, secret);
  if (typeof value === 'undefined') {
    throw _getSEAError('Could not decrypt');
  }
  return value;
};

const _getSEAError = (_default?: Error | string): Error | undefined => {
  let err = SEA.err || _default;
  if (!err) {
    return undefined;
  }
  if (typeof err === 'object' && err instanceof Error) {
    return err;
  }
  return new Error(String(err));
};

// Lit encryption / decryption
export function encodeb64(uintarray: any) {
  const b64 = Buffer.from(uintarray).toString('base64');
  return b64;
}

export function blobToBase64(blob: Blob) {
  return new Promise((resolve, _) => {
    const reader = new FileReader();
    reader.onloadend = () =>
      resolve(
        // @ts-ignore
        reader.result.replace('data:application/octet-stream;base64,', ''),
      );
    reader.readAsDataURL(blob);
  });
}

export function decodeb64(b64String: any) {
  return new Uint8Array(Buffer.from(b64String, 'base64'));
}

export async function encryptWithLit(
  toEncrypt: string,
  accessControlConditions: Array<Object>,
  chain: string = 'ethereum',
): Promise<Array<any>> {
  const authSig: AuthSig = await LitJsSdk.checkAndSignAuthMessage({ chain });
  const { encryptedString, symmetricKey } = await LitJsSdk.encryptString(toEncrypt);
  const encryptedSymmetricKey = await window.litNodeClient.saveEncryptionKey({
    accessControlConditions,
    symmetricKey,
    authSig,
    chain,
    permanent: false,
  });

  const encryptedStringBase64 = await blobToBase64(encryptedString);
  const encryptedSymmetricKeyBase64 = encodeb64(encryptedSymmetricKey);

  return [encryptedStringBase64, encryptedSymmetricKeyBase64];
}

export async function decryptWithLit(
  encryptedString: string,
  encryptedSymmetricKey: string,
  accessControlConditions: Array<Object>,
  chain: string = 'ethereum',
): Promise<string> {
  const decodedString = decodeb64(encryptedString);
  const decodedSymmetricKey = decodeb64(encryptedSymmetricKey);

  if (!decodedString || !decodedSymmetricKey) {
    throw new Error('Decryption failed');
  }

  const authSig: AuthSig = await LitJsSdk.checkAndSignAuthMessage({ chain });
  const toDecrypt = uint8ArrayToString(decodedSymmetricKey, 'base16');
  const decryptedSymmetricKey = await window.litNodeClient.getEncryptionKey({
    accessControlConditions,
    toDecrypt,
    chain,
    authSig,
  });
  const decryptedString = await LitJsSdk.decryptString(new Blob([decodedString]), decryptedSymmetricKey);

  return decryptedString;
}
