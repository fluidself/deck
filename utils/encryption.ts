// @ts-ignore
import LitJsSdk from 'lit-js-sdk';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import type { AuthSig } from 'types/lit';
import type { Deck, NoteItem } from 'types/ceramic';

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
  // TODO: encryptString() faster?
  const { encryptedZip, symmetricKey } = await LitJsSdk.zipAndEncryptString(toEncrypt);

  const encryptedSymmetricKey = await window.litNodeClient.saveEncryptionKey({
    accessControlConditions,
    symmetricKey,
    authSig,
    chain,
    permanent: false,
  });

  const encryptedZipBase64 = await blobToBase64(encryptedZip);
  const encryptedSymmetricKeyBase64 = encodeb64(encryptedSymmetricKey);

  return [encryptedZipBase64, encryptedSymmetricKeyBase64];
}

export async function decryptWithLit(
  encryptedZip: Uint8Array,
  encryptedSymmetricKey: Uint8Array,
  accessControlConditions: Array<Object>,
  chain: string = 'ethereum',
): Promise<string> {
  const authSig: AuthSig = await LitJsSdk.checkAndSignAuthMessage({ chain });
  const toDecrypt = uint8ArrayToString(encryptedSymmetricKey, 'base16');
  const decryptedSymmetricKey = await window.litNodeClient.getEncryptionKey({
    accessControlConditions,
    toDecrypt,
    chain,
    authSig,
  });
  // TODO: decryptString() faster?
  const decryptedFiles = await LitJsSdk.decryptZip(new Blob([encryptedZip]), decryptedSymmetricKey);
  const decryptedString = await decryptedFiles['string.txt'].async('text');

  return decryptedString;
}

export async function decodeFromB64(encryptedZip: string, encryptedSymmetricKey: string) {
  try {
    const decodedZip = decodeb64(encryptedZip);
    const decodedSymmetricKey = decodeb64(encryptedSymmetricKey);

    return { success: true, decodedZip, decodedSymmetricKey };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function decryptDeck(deck: any) {
  const { encryptedZip, symmetricKey, accessControlConditions } = deck;
  const { success, decodedZip, decodedSymmetricKey } = await decodeFromB64(encryptedZip, symmetricKey);
  // TODO: fix
  if (!success || !decodedZip || !decodedSymmetricKey) {
    return { notes: [], accessControlConditions: null };
  }

  const decryptedString = await decryptWithLit(decodedZip, decodedSymmetricKey, accessControlConditions);
  const { notes }: { notes: NoteItem[] } = JSON.parse(decryptedString);

  return { notes, accessControlConditions };
}
