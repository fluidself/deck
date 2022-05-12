import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';
import SEA from 'gun/sea';
import type { ISEAPair } from 'gun/types/sea';
import type { Deck } from 'types/gun';
import { AccessControlCondition, BooleanCondition } from 'types/lit';
import { encryptWithLit, decryptWithLit, encrypt, decrypt } from 'utils/encryption';
import createOnboardingNotes from 'utils/createOnboardingNotes';
import { useAuth } from 'utils/useAuth';
import useGun from 'utils/useGun';
import { useStore } from 'lib/store';

export default function useDeck() {
  const router = useRouter();
  const {
    query: { deckId },
  } = router;
  const { getGun, getUser, authenticate, createUser } = useGun();
  const { user } = useAuth();
  const [decks, setDecks] = useState<{ [key: string]: Deck }>({});
  const [decksReady, setDecksReady] = useState<boolean>(false);
  const userPair = useStore(state => state.userPair);
  const deckPair = useStore(state => state.deckPair);

  useEffect(() => {
    const initData = async () => {
      if (!user?.id) return;
      const appPair = JSON.parse(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR!);
      const hashedAddr = await SEA.work(user.id, appPair, null, { name: 'SHA-256' });
      await getGun()
        ?.user(`${process.env.NEXT_PUBLIC_GUN_APP_PUBLIC_KEY}`)
        .get('users')
        .get(hashedAddr)
        .get('decks')
        .map()
        .once(async (deck: any) => {
          if (deck && deck.user) {
            const decryptedDeck = await decrypt(deck, { pair: appPair });
            setDecks((previousDecks: any) => ({
              ...previousDecks,
              [deck.id]: decryptedDeck,
            }));
          }
        })
        .then();

      setDecksReady(true);
    };

    initData();
  }, [user]);

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

  const createDeck = async (deckName: string) => {
    if (!user?.id) return;
    // @ts-ignore
    const userPair = getUser()?._.sea;
    const appPair = JSON.parse(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR!);
    const deckPair = await SEA.pair();
    const deckId = uuidv4();
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
      JSON.stringify(deckPair),
      accessControlConditions,
    );

    const certificate = await SEA.certify(userPair.pub, [{ '*': 'notes' }, 'note_tree'], deckPair);
    await authenticate(deckPair);
    await getUser()?.get('certs').get(userPair.pub).put(certificate).then();

    const deck = {
      id: deckId,
      name: deckName,
      user: user.id, // needed?
      pub: deckPair.pub, // needed?
      encryptedString: encryptedStringBase64,
      encryptedSymmetricKey: encryptedSymmetricKeyBase64,
      accessControlConditions: JSON.stringify(accessControlConditions),
    };
    const encryptedDeck = await encrypt(deck, { pair: appPair });
    const hashedAddr = await SEA.work(user.id, appPair, null, { name: 'SHA-256' });
    await authenticate(appPair);

    await getUser()?.get('decks').get(deckId).put(encryptedDeck).then();
    await getUser()?.get('users').get(hashedAddr!).get('decks').get(deckId).put(encryptedDeck).then();

    await authenticate(userPair);
    const onboardingNotes = createOnboardingNotes();
    const promises = [];
    for (const note of onboardingNotes) {
      promises.push(addNote(deckPair, certificate, note));
    }
    await Promise.all(promises);

    const response = await fetch('/api/deck', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deckId, pair: deckPair }),
    });
    if (!response.ok) throw new Error('Failed to create DECK');

    return deckId;
  };

  const addNote = async (deckPair: ISEAPair, cert: any, note: any) =>
    new Promise<void>(async (resolve, reject) => {
      const encryptedNote = await encrypt(note, { pair: deckPair });
      getGun()
        .user(deckPair.pub)
        .get('notes')
        .get(note.id)
        .put(
          encryptedNote,
          (ack: any) => {
            if (ack.err) {
              reject();
            } else {
              resolve();
            }
          },
          { opt: { cert } },
        );
    });

  const renameDeck = async (deckName: string) => {
    if (!deckId || typeof deckId !== 'string' || !deckName || !user?.id) return;

    // TODO: enforce onlyOwner? or just filter out UI option for others
    const appPair = JSON.parse(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR!);
    const updates = { name: deckName };
    const encUpdates = await encrypt(updates, { pair: appPair });
    const hashedAddr = await SEA.work(user.id, appPair, null, { name: 'SHA-256' });

    await authenticate(appPair);
    await getUser()?.get('decks').get(deckId).get('name').put(encUpdates.name).then();
    await getUser()?.get('users').get(hashedAddr!).get('decks').get(deckId).get('name').put(encUpdates.name).then();

    await authenticate(userPair);
  };

  // const deleteDeck = useCallback(async () => {}, []);

  // TODO: should only original DECK creator be allowed to call this?
  // if so, enforce here or filter out UI options?
  const provisionAccess = async (acc: AccessControlCondition[]) => {
    if (!deckId || typeof deckId !== 'string' || !acc || !user?.id) return;

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
    const appPair = JSON.parse(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR!);
    const updates = {
      encryptedString: encryptedStringBase64,
      encryptedSymmetricKey: encryptedSymmetricKeyBase64,
      accessControlConditions: JSON.stringify(accessControlConditions),
    };
    const encUpdates = await encrypt(updates, { pair: appPair });
    const hashedAddr = await SEA.work(user.id, appPair, null, { name: 'SHA-256' });

    await authenticate(appPair);
    await getUser()?.get('decks').get(deckId).get('encryptedString').put(encUpdates.encryptedString).then();
    await getUser()?.get('decks').get(deckId).get('encryptedSymmetricKey').put(encUpdates.encryptedSymmetricKey).then();
    await getUser()?.get('decks').get(deckId).get('accessControlConditions').put(encUpdates.accessControlConditions).then();
    await getUser()
      ?.get('users')
      .get(hashedAddr!)
      .get('decks')
      .get(deckId)
      .get('encryptedString')
      .put(encUpdates.encryptedString)
      .then();
    await getUser()
      ?.get('users')
      .get(hashedAddr!)
      .get('decks')
      .get(deckId)
      .get('encryptedSymmetricKey')
      .put(encUpdates.encryptedSymmetricKey)
      .then();
    await getUser()
      ?.get('users')
      .get(hashedAddr!)
      .get('decks')
      .get(deckId)
      .get('accessControlConditions')
      .put(encUpdates.accessControlConditions)
      .then();

    // TOOO: revoke certificates?
    await authenticate(userPair);
  };

  const verifyAccess = async (requestedDeckId: string) => {
    // @ts-ignore
    const userPair = getUser()?._.sea;
    const appPair = JSON.parse(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR!);
    const storedDeck = await getGun()
      ?.user(`${process.env.NEXT_PUBLIC_GUN_APP_PUBLIC_KEY}`)
      .get('decks')
      .get(requestedDeckId)
      .then();

    if (!storedDeck) throw new Error('Unable to verify access');

    const decryptedDeck = await decrypt(storedDeck, { pair: appPair });
    const { encryptedString, encryptedSymmetricKey, accessControlConditions } = decryptedDeck;
    const decryptedDeckKeypair = await decryptWithLit(encryptedString, encryptedSymmetricKey, accessControlConditions);
    if (!decryptedDeckKeypair) throw new Error('Unable to verify access');

    const deckPair = JSON.parse(decryptedDeckKeypair);
    const certificate = await SEA.certify(userPair.pub, [{ '*': 'notes' }, 'note_tree'], deckPair);
    await authenticate(deckPair);
    await getUser()?.get('certs').get(userPair.pub).put(certificate).then();

    const response = await fetch('/api/deck', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deckId: decryptedDeck.id, pair: deckPair }),
    });
    if (!response.ok) throw new Error('Unable to verify access');

    return;
  };

  return {
    decks,
    decksReady,
    // getDecks,
    createDeck,
    renameDeck,
    // deleteDeck,
    provisionAccess,
    verifyAccess,
  };
}
