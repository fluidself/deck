import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';
import type { ISEAPair } from 'gun/types/sea';
import type { Deck } from 'types/gun';
import { AccessControlCondition, BooleanCondition } from 'types/lit';
import { encryptWithLit, decryptWithLit, encrypt, decrypt } from 'utils/encryption';
import createOnboardingNotes from 'utils/createOnboardingNotes';
import { useAuth } from 'utils/useAuth';
import useGun from 'utils/useGun';
import { store } from 'lib/store';

export default function useDeck() {
  const router = useRouter();
  const {
    query: { deckId },
  } = router;
  const { getUser, authenticate, createUser } = useGun();
  const { user } = useAuth();
  const [decks, setDecks] = useState<{ [key: string]: Deck }>({});
  const [decksReady, setDecksReady] = useState<boolean>(false);

  useEffect(() => {
    const initData = async () => {
      if (!process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR || !user?.id) return;
      const pair = JSON.parse(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR);
      await authenticate(pair);
      await getUser()
        ?.get('decks')
        .map()
        .once(async deck => {
          if (deck && deck.user) {
            const decryptedDeck = await decrypt(deck, { pair });
            if (decryptedDeck.user === user.id) {
              setDecks((previousDecks: any) => ({
                ...previousDecks,
                [deck.id]: decryptedDeck,
              }));
            }
          }
        })
        .then();

      setDecksReady(true);
    };

    initData();
  }, []);

  // const checkReauthenticate = async () => {
  //   if (!process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR) return;
  //   const gunUser = getUser()?.is;

  //   if (!gunUser) {
  //     try {
  //       await authenticate(JSON.parse(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR));
  //     } catch (err) {
  //       console.error(err);
  //     }
  //   }
  // };

  // const getDecks = useCallback(async () => {
  //   if (!process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR) return;
  //   const pair = JSON.parse(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR);
  //   await authenticate(pair);

  //   const decks: any[] = [];
  //   await getUser()
  //     ?.get('decks')
  //     .map()
  //     .once(async deck => {
  //       if (deck && deck.user) {
  //         console.log('getDecks', deck);
  //         const decryptedDeck = await decrypt(deck, { pair });
  //         decks.push(decryptedDeck);
  //         // setDecks((previousDecks: any) => ({
  //         //   ...previousDecks,
  //         //   [deck.id]: decryptedDeck,
  //         // }));
  //       }
  //     })
  //     .then();
  //   console.log('getDecks', decks);
  //   return decks;
  // }, [checkReauthenticate, getUser]);

  const insertDeck = async (deckName: string) => {
    if (!process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR || !user?.id) return;

    const deckId = uuidv4();
    const deckKeypair = await createUser();
    const accessControlConditions = [
      {
        contractAddress: '',
        standardContractType: '',
        chain: 'ethereum',
        method: '',
        parameters: [':userAddress'],
        returnValueTest: {
          comparator: '=',
          value: user.id,
        },
      },
    ];
    const [encryptedStringBase64, encryptedSymmetricKeyBase64] = await encryptWithLit(
      JSON.stringify(deckKeypair),
      accessControlConditions,
    );

    const appKeypair = JSON.parse(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR);
    await authenticate(appKeypair);

    const deck = {
      id: deckId,
      name: deckName,
      user: user.id,
      encryptedString: encryptedStringBase64,
      encryptedSymmetricKey: encryptedSymmetricKeyBase64,
      accessControlConditions: JSON.stringify(accessControlConditions),
    };
    const encryptedDeck = await encrypt(deck, { pair: appKeypair });
    // TODO: alt?
    // await getUser()?.get('decks').get(user.id).get(deckId).put(encryptedDeck).then();
    await getUser()?.get('decks').get(deckId).put(encryptedDeck).then();

    await authenticate(deckKeypair);
    const onboardingNotes = createOnboardingNotes();
    for (const note of onboardingNotes) {
      const encryptedNote = await encrypt(note, { pair: deckKeypair });
      await getUser()?.get('notes').get(note.id).put(encryptedNote).then();
    }

    return deckId;
  };

  // const renameDeck = useCallback(async () => {}, []);

  // const deleteDeck = useCallback(async () => {}, []);

  // TODO: should only original DECK creator be allowed to call this?
  // if so, enforce here or filter out UI options?
  const provisionAccess = async (acc: AccessControlCondition[]) => {
    if (!deckId || typeof deckId !== 'string' || !acc || !user?.id) return;

    const deckPair: ISEAPair = store.getState().deckPair;
    const accessControlConditions: (AccessControlCondition | BooleanCondition)[] = [
      {
        contractAddress: '',
        standardContractType: '',
        chain: 'ethereum',
        method: '',
        parameters: [':userAddress'],
        returnValueTest: {
          comparator: '=',
          value: user.id,
        },
      },
      { operator: 'or' },
      ...acc,
    ];
    const [encryptedStringBase64, encryptedSymmetricKeyBase64] = await encryptWithLit(
      JSON.stringify(deckPair),
      accessControlConditions,
    );

    const appKeypair = JSON.parse(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR!);
    await authenticate(appKeypair);

    const updates = {
      encryptedString: encryptedStringBase64,
      encryptedSymmetricKey: encryptedSymmetricKeyBase64,
      accessControlConditions: JSON.stringify(accessControlConditions),
    };
    const encUpdates = await encrypt(updates, { pair: appKeypair });

    await getUser()?.get('decks').get(deckId).get('encryptedString').put(encUpdates.encryptedString).then();
    await getUser()?.get('decks').get(deckId).get('encryptedSymmetricKey').put(encUpdates.encryptedSymmetricKey).then();
    await getUser()?.get('decks').get(deckId).get('accessControlConditions').put(encUpdates.accessControlConditions).then();

    await authenticate(deckPair);
  };

  const verifyAccess = async (requestedDeckId: string) => {
    const pair = JSON.parse(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR!);
    await authenticate(pair);

    const deck = await getUser()?.get('decks').get(requestedDeckId).then();
    if (!deck) {
      throw new Error('Unable to verify access');
    }

    const decryptedDeck = await decrypt(deck, { pair });
    const { encryptedString, encryptedSymmetricKey, accessControlConditions } = decryptedDeck;
    const decryptedDeckKeypair = await decryptWithLit(encryptedString, encryptedSymmetricKey, accessControlConditions);

    await authenticate(JSON.parse(decryptedDeckKeypair));
  };

  return {
    decks,
    decksReady,
    // getDecks,
    insertDeck,
    // renameDeck,
    // deleteDeck,
    provisionAccess,
    verifyAccess,
  };
}
