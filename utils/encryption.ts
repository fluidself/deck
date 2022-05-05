// @ts-ignore
import LitJsSdk from 'lit-js-sdk';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import type { AuthSig } from 'types/lit';

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
