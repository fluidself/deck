// @ts-ignore
import LitJsSdk from 'lit-js-sdk';
import { withIronSessionSsr } from 'iron-session/next';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { toast } from 'react-toastify';
import { ironOptions } from 'constants/iron-session';
import { Deck } from 'types/gun';
import useIsMounted from 'utils/useIsMounted';
import { useAuth } from 'utils/useAuth';
import useGun from 'utils/useGun';
import useDeck from 'utils/useDeck';
import { decryptWithLit, decrypt } from 'utils/encryption';
import { AuthSig } from 'types/lit';
import HomeHeader from 'components/home/HomeHeader';
import RequestDeckAccess from 'components/home/RequestDeckAccess';
import ProvideDeckName from 'components/home/ProvideDeckName';
import Button from 'components/home/Button';

export default function AppHome() {
  const router = useRouter();
  const [{ data: accountData }] = useAccount();
  const { user, isLoaded, signOut } = useAuth();
  const { getUser, authenticate } = useGun();
  const { decks, decksReady, insertDeck } = useDeck();
  const [requestingAccess, setRequestingAccess] = useState<boolean>(false);
  const [creatingDeck, setCreatingDeck] = useState<boolean>(false);
  const isMounted = useIsMounted();

  useEffect(() => {
    const redirect = async () => {
      if (!process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR) return;

      const deck: Deck = Object.values(decks)[1];
      const { encryptedString, encryptedSymmetricKey, accessControlConditions } = deck;
      const decryptedDeckKeypair = await decryptWithLit(encryptedString, encryptedSymmetricKey, accessControlConditions);

      await authenticate(JSON.parse(decryptedDeckKeypair));
      router.push(`/app/${deck.id}`);
    };

    if (Object.keys(decks).length > 0) {
      redirect();
    }
  }, [Object.keys(decks).length]);

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
    const deckId = await insertDeck(deckName);
    if (!deckId) {
      toast.error('There was an error creating the DECK');
      return;
    }

    toast.success(`Successfully created ${deckName}`);
    setCreatingDeck(false);
    router.push(`/app/${deckId}`);
  };

  // const verifyAccess = async (requestedDeck: string) => {
  //   if (!requestedDeck) return;

  //   // if (decks?.find(deck => deck.id === requestedDeck)) {
  //   //   toast.success('You own that DECK!');
  //   //   setRequestingAccess(false);
  //   //   router.push(`/app/${requestedDeck}`);
  //   //   return;
  //   // }

  //   const { data: accessParams } = await supabase.from<Deck>('decks').select('access_params').eq('id', requestedDeck).single();
  //   if (!accessParams?.access_params) {
  //     toast.error('Unable to verify access.');
  //     return;
  //   }

  //   const { resource_id: resourceId, access_control_conditions: accessControlConditions } = accessParams?.access_params || {};
  //   if (!resourceId || !accessControlConditions || !accessControlConditions[0].chain) {
  //     toast.error('Unable to verify access.');
  //     return;
  //   }

  //   try {
  //     const chain = accessControlConditions[0].chain;
  //     const authSig: AuthSig = await LitJsSdk.checkAndSignAuthMessage({ chain });
  //     const jwt = await window.litNodeClient.getSignedToken({
  //       accessControlConditions,
  //       chain,
  //       authSig,
  //       resourceId,
  //     });

  //     const response = await fetch('/api/verify-jwt', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({ jwt, requestedDeck }),
  //     });

  //     if (!response.ok) return;

  //     toast.success('Access to DECK is granted.');
  //     setRequestingAccess(false);
  //     router.push(`/app/${requestedDeck}`);
  //   } catch (e: any) {
  //     console.error(e);
  //     toast.error('Unable to verify access.');
  //   }
  // };

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
                  // onDeckAccessRequested={async (requestedDeck: string) => await verifyAccess(requestedDeck)}
                  onDeckAccessRequested={async (requestedDeck: string) => {}}
                />
              ) : (
                <Button onClick={() => setRequestingAccess(true)}>Join a DECK</Button>
              )}
              <Button
                onClick={async () => {
                  if (!process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR) return;
                  const appPair = JSON.parse(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR);
                  await authenticate(appPair);
                  const deckId = '034b2c4b-0d7e-41fe-9d34-f6edd53951e5';

                  const deck = await getUser()?.get('decks').get(deckId).then();
                  const decryptedDeck = await decrypt(deck, { pair: appPair });

                  const { encryptedString, encryptedSymmetricKey, accessControlConditions } = decryptedDeck;
                  const decryptedDeckKeypair = await decryptWithLit(
                    encryptedString,
                    encryptedSymmetricKey,
                    accessControlConditions,
                  );

                  await authenticate(JSON.parse(decryptedDeckKeypair));
                  router.push(`/app/${deckId}`);
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

  if (gun && deck) {
    return { redirect: { destination: `/app/${deck}`, permanent: false } };
  } else {
    return user ? { props: {} } : { redirect: { destination: '/', permanent: false } };
  }
}, ironOptions);
