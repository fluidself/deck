// @ts-ignore
import LitJsSdk from 'lit-js-sdk';
import { withIronSessionSsr } from 'iron-session/next';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import { ironOptions } from 'constants/iron-session';
import { Deck } from 'types/gun';
import useIsMounted from 'utils/useIsMounted';
import { useAuth } from 'utils/useAuth';
import useGun from 'utils/useGun';
import useDeck from 'utils/useDeck';
import { decryptWithLit, decrypt, encrypt } from 'utils/encryption';
import HomeHeader from 'components/home/HomeHeader';
import RequestDeckAccess from 'components/home/RequestDeckAccess';
import ProvideDeckName from 'components/home/ProvideDeckName';
import Button from 'components/home/Button';
// import SEA from 'gun/sea';
// import createOnboardingNotes from 'utils/createOnboardingNotes';

export default function AppHome() {
  const router = useRouter();
  const [{ data: accountData }] = useAccount();
  const { user, isLoaded, signOut } = useAuth();
  const { getUser, getGun, authenticate } = useGun();
  const { decks, decksReady, createDeck, verifyAccess } = useDeck();
  const [requestingAccess, setRequestingAccess] = useState<boolean>(false);
  const [creatingDeck, setCreatingDeck] = useState<boolean>(false);
  const isMounted = useIsMounted();

  useEffect(() => {
    const redirect = async () => {
      // const deck: Deck = Object.values(decks)[0];
      const deck = decks['a8e23ad4-be36-4b35-ae43-1739b80ffab6'];
      if (typeof deck === 'undefined' || !deck) return;
      const { encryptedString, encryptedSymmetricKey, accessControlConditions } = deck;
      const decryptedDeckKeypair = await decryptWithLit(encryptedString, encryptedSymmetricKey, accessControlConditions);

      const response = await fetch('/api/deck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deckId: deck.id, pair: decryptedDeckKeypair }),
      });
      if (!response.ok) return;

      router.push(`/app/${deck.id}`);
    };

    if (Object.keys(decks).length > 0) {
      redirect();
    }
    // console.log(decks);
  }, [decks]);

  useEffect(() => {
    const initLit = async () => {
      const client = new LitJsSdk.LitNodeClient({ alertWhenUnauthorized: false, debug: false });
      await client.connect();
      window.litNodeClient = client;
    };

    if (!window.litNodeClient && isMounted() && user) {
      initLit();
    }
  }, [isMounted, user]);

  useEffect(() => {
    const onDisconnect = () => signOut();
    accountData?.connector?.on('disconnect', onDisconnect);

    return () => {
      accountData?.connector?.off('disconnect', onDisconnect);
    };
  }, [accountData?.connector, signOut]);

  const createNewDeck = async (deckName: string) => {
    const deckId = await createDeck(deckName);
    if (!deckId) {
      toast.error('There was an error creating the DECK');
      return;
    }

    toast.success(`Successfully created ${deckName}`);
    setCreatingDeck(false);
    router.push(`/app/${deckId}`);
  };

  const verifyDeckAccess = async (requestedDeck: string) => {
    if (!requestedDeck) return;

    try {
      await verifyAccess(requestedDeck);
      toast.success('Access to DECK is granted');
      setRequestingAccess(false);
      router.push(`/app/${requestedDeck}`);
    } catch (e: any) {
      toast.error('Unable to verify access.');
    }
  };

  return (
    <div id="app-container" className="h-screen font-display">
      <div className="flex flex-col w-full h-full bg-gray-900 text-gray-100">
        <div className="flex flex-col items-end text-white min-h-[27px] pr-8 mt-2">{isLoaded && user && <HomeHeader />}</div>
        <div className="flex flex-col flex-1 overflow-y-hidden container">
          <div className="flex flex-col items-center flex-1 w-full p-12">
            <h1 className="mb-12 text-xl text-center mt-24 lg:mt-48">Welcome to DECK</h1>
            <p className="text-center">
              You are one step closer to compiling your new favorite knowledge base. Work by yourself or join forces with your
              community. Get started by creating a new DECK or joining one if you have received an invitation.
            </p>

            <div className="flex flex-col w-1/2 mx-auto mt-12 space-y-5">
              {/* {Object.keys(decks).length > 0 && (
                <Button
                  onClick={async () => {
                    if (!process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR) return;

                    const deck: Deck = Object.values(decks)[0];
                    const { encryptedString, encryptedSymmetricKey, accessControlConditions } = deck;
                    const decryptedDeckKeypair = await decryptWithLit(
                      encryptedString,
                      encryptedSymmetricKey,
                      accessControlConditions,
                    );

                    await authenticate(JSON.parse(decryptedDeckKeypair));
                    router.push(`/app/${deck.id}`);
                  }}
                >
                  Use a recent DECK ({Object.values(decks)[0].name})
                </Button>
              )} */}
              {creatingDeck ? (
                <ProvideDeckName
                  onCancel={() => setCreatingDeck(false)}
                  onDeckNameProvided={async (deckName: string) => await createNewDeck(deckName)}
                />
              ) : (
                <Button onClick={() => setCreatingDeck(true)}>Create a new DECK</Button>
              )}

              {requestingAccess ? (
                <RequestDeckAccess
                  onCancel={() => setRequestingAccess(false)}
                  onDeckAccessRequested={async (requestedDeck: string) => await verifyDeckAccess(requestedDeck)}
                />
              ) : (
                <Button onClick={() => setRequestingAccess(true)}>Join a DECK</Button>
              )}
              <Button
                onClick={async () => {
                  const userPair = {
                    pub: 'oOL8R7Z5ONXNtDbuIlM_GMfcBGqhq5MLhZo386J3gVw.pLUE52Pf2Gpcv7I1zCBy8zLNqt-eITV2XUmvm9yg9Kc',
                    priv: 'nJ6cXM8fyrjI21mhKErJr5kK0VAiBnMii-uOh2aVOLI',
                    epub: 'JvbNwyuYOlhQjaoXekFE6_levlN9D4VymdJSiDxaTyU.3WY8Q3LfrKr522spAPvDF-xVuSYc6bEDb00-YTRaZLY',
                    epriv: 'y4BSKEG7PuLajwO2R0Jx3L-PZ4Mi2b3Ph_RLmAr3gMg',
                  };
                  const deckPair = {
                    pub: 'OW7jIBnR-eELOLczXaFL94GDd_Y1jFsl4W6pkVLb-AI.90UvlOMEnA5ZcNlZASyo5zi0i9uTevkoq-_RTLj2NCI',
                    priv: 'AqkMXlW-HFIzRti58cf6Hu7mACgc6epWU9o59jf7Pxc',
                    epub: 'CdVJ6VA0dzZoHbJz0GLeQ1tnHY5oiFVKLuxsV9g-kv8.K735R7ah5NyNX3Hkl59z7cs4LD5K-yzxwo8jkIokOPY',
                    epriv: 'K7rJzcRdgbkY5b13i7dbF-6R4hCKp7ELwX0tUa9qKZY',
                  };
                  const note = {
                    id: uuidv4(),
                    title: 'Another One',
                    content: JSON.stringify([{ id: uuidv4(), type: 'paragraph', children: [{ text: '' }] }]),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  };
                  const encryptedNote = await encrypt(note, { pair: deckPair });
                  const cert = await getGun().user(deckPair.pub).get('certs').get(userPair.pub).then();

                  await getGun()
                    .user(deckPair.pub)
                    .get('notes')
                    .get(note.id)
                    .put(
                      encryptedNote,
                      (ack: any) => {
                        console.log(ack);
                      },
                      { opt: { cert } },
                    )
                    .then();

                  // const deckId = '266572b7-f810-4f0a-ac43-fcc38202265b';
                  // const deck = await getGun().user(process.env.NEXT_PUBLIC_GUN_APP_PUBLIC_KEY).get('decks').get(deckId).then();
                  // const decryptedDeck = await decrypt(deck, { pair: JSON.parse(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR!) });
                  // const { encryptedString, encryptedSymmetricKey, accessControlConditions } = decryptedDeck;
                  // const decryptedDeckKeypair = JSON.parse(
                  //   await decryptWithLit(encryptedString, encryptedSymmetricKey, accessControlConditions),
                  // );
                  // console.log(decryptedDeck);
                  // console.log(JSON.parse(decryptedDeckKeypair));
                  // const notes = await getGun()?.get(`~${decryptedDeckKeypair.pub}`).get('notes').then();
                  // console.log(notes);
                  // getGun()
                  //   ?.user(`${decryptedDeckKeypair.pub}`)
                  //   .get('notes')
                  //   .map()
                  //   .once(async (x: any) => {
                  //     const decrnote = await decrypt(x, { pair: decryptedDeckKeypair });
                  //     console.log(decrnote);
                  //   });
                  // await authenticate(JSON.parse(decryptedDeckKeypair));
                  // router.push(`/app/${deckId}`);
                }}
              >
                Test Gun
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = withIronSessionSsr(async function ({ req }) {
  const { user, gun, deck } = req.session;
  console.log(user, gun, deck);

  if (user && gun && deck) {
    // return { redirect: { destination: `/app/${deck.id}`, permanent: false } };
    return user ? { props: {} } : { redirect: { destination: '/', permanent: false } };
  } else {
    return user ? { props: {} } : { redirect: { destination: '/', permanent: false } };
  }
}, ironOptions);
