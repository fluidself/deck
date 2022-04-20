import { useCallback } from 'react';
import { useConnection, useViewerRecord, useCore } from '@self.id/framework';
import type { ModelTypes } from 'types/ceramic';
import createOnboardingNotes from 'utils/createOnboardingNotes';
import { encryptWithLit } from 'utils/encryption';

export default function useCreateDeck() {
  const decksRecord = useViewerRecord<ModelTypes, 'decks'>('decks');
  const accountsRecord = useViewerRecord<ModelTypes, 'cryptoAccounts'>('cryptoAccounts');
  const [connection, connect] = useConnection();
  const { dataModel } = useCore<ModelTypes>();

  const create = useCallback(
    async (deckName, notes = null, acc = null) => {
      if (!decksRecord.set || !accountsRecord.content) return;

      if (connection.status !== 'connected') {
        await connect();
      }

      try {
        const userEthAddressRecord = Object.keys(accountsRecord.content).find(record => record.includes('@eip155:1'));
        const userEthAddress = userEthAddressRecord?.replace('@eip155:1', '');
        const accessControlConditions = acc
          ? acc
          : [
              {
                contractAddress: '',
                standardContractType: '',
                chain: 'ethereum',
                method: '',
                parameters: [':userAddress'],
                returnValueTest: {
                  comparator: '=',
                  value: userEthAddress,
                },
              },
            ];
        // const onboardingNotes = createOnboardingNotes();
        // const toEncrypt = JSON.stringify({ notes: onboardingNotes });
        const notesToEncrypt = notes ? notes : createOnboardingNotes();
        const toEncrypt = JSON.stringify({ notes: notesToEncrypt });
        const [encryptedZipBase64, encryptedSymmetricKeyBase64] = await encryptWithLit(toEncrypt, accessControlConditions);
        const doc = await dataModel.createTile('Deck', {
          encryptedZip: encryptedZipBase64,
          symmetricKey: encryptedSymmetricKeyBase64,
          accessControlConditions,
        });

        if (!doc) {
          throw new Error('There was an error creating the DECK');
        }

        const decks = decksRecord.content?.decks ?? [];
        await decksRecord.set({ decks: [...decks, { id: doc.id.toUrl(), deck_name: deckName }] });

        const deckId = doc.id.toString();

        return deckId;
      } catch (error) {
        throw error ?? new Error('There was an error creating the DECK');
      }
    },
    [decksRecord, accountsRecord, connection, connect],
  );

  return create;
}
