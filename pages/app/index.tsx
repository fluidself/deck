// @ts-ignore
import LitJsSdk from 'lit-js-sdk';
import { withIronSessionSsr } from 'iron-session/next';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { toast } from 'react-toastify';
import { ironOptions } from 'constants/iron-session';
import supabase from 'lib/supabase';
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
import PageLoading from 'components/PageLoading';

export default function AppHome() {
  const router = useRouter();
  const [{ data: accountData }] = useAccount();
  const { user, isLoaded, signOut } = useAuth();
  const { getUser, authenticate } = useGun();
  const { decks, decksReady, insertDeck } = useDeck();
  const [requestingAccess, setRequestingAccess] = useState<boolean>(false);
  const [creatingDeck, setCreatingDeck] = useState<boolean>(false);
  const [lookingForDeck, setLookingForDeck] = useState<boolean>(true);
  const isMounted = useIsMounted();

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

  useEffect(() => {
    // console.log(sessionStorage.getItem('pair'));
    router.events.on('routeChangeStart', () => setLookingForDeck(true));
    const lookForUserDeck = async () => {
      if (!process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR || !user?.id) return;
      const deckObjs: Deck[] = Object.values(decks);
      if (decksReady && deckObjs.length && deckObjs.find(deck => deck.user === user.id)) {
        const deckId = deckObjs.find(deck => deck.user === user.id)?.id ?? '';
        const encryptedDeck = await getUser()?.get('decks').get(deckId).then();
        const decryptedDeck = await decrypt(encryptedDeck, { pair: JSON.parse(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR) });

        const { encryptedString, encryptedSymmetricKey, accessControlConditions } = decryptedDeck;
        const decryptedDeckKeypair = await decryptWithLit(encryptedString, encryptedSymmetricKey, accessControlConditions);

        await authenticate(JSON.parse(decryptedDeckKeypair));

        router.replace(`/app/${deckId}`);
      }

      setLookingForDeck(false);
    };

    if (decksReady) {
      lookForUserDeck();
    }
  }, [user, decks, decksReady]);

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

  if (lookingForDeck || !decksReady) {
    return <PageLoading />;
  }

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
                  await authenticate(JSON.parse(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR));
                  console.log('logged in as: ', getUser()?.is?.pub);

                  getUser()
                    ?.get('decks')
                    .map()
                    .once((deck, deckId) => console.log(deckId, deck));
                  // .then();
                  // console.log(decks);
                  // const deckId = '1ef1fc3b-563b-49e5-86c5-f3619989cf68';
                  // const deckToAccess = await getUser()?.get(`deck/${deckId}`).then();

                  // const { encryptedString, encryptedSymmetricKey, accessControlConditions } = deckToAccess;
                  // const decryptedDeckKeypair = await decryptWithLit(
                  //   encryptedString,
                  //   encryptedSymmetricKey,
                  //   JSON.parse(accessControlConditions),
                  // );

                  // await authenticate(JSON.parse(decryptedDeckKeypair));
                  // console.log('logged in as: ', getUser()?.is?.pub);

                  // router.push(`/app/${deckId}`);
                }}
              >
                Test Gun
              </Button>
              <Button
                onClick={async () => {
                  console.log(decks);
                }}
              >
                Test Decks storage
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = withIronSessionSsr(async function ({ req }) {
  const { user } = req.session;
  // const decks = await selectDecks(user?.id);

  // if (decks.length) {
  //   return { redirect: { destination: `/app/${decks[decks.length - 1].id}`, permanent: false } };
  // } else {
  //   return user ? { props: {} } : { redirect: { destination: '/', permanent: false } };
  // }
  return user ? { props: {} } : { redirect: { destination: '/', permanent: false } };
}, ironOptions);
