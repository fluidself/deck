import React, { createContext, useContext, useRef, useEffect, useState } from 'react';
import type { IGunUserInstance, ISEAPair } from 'gun/types/sea';
import Gun from 'gun/gun';
import SEA from 'gun/sea';
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/rindexed';
import 'gun/lib/store';
import 'gun/lib/then';
import { encrypt, encryptWithLit, decryptWithLit, decrypt } from 'utils/encryption';

if (!process.env.NEXT_PUBLIC_GUN_PEERS) {
  throw new Error('NEXT_PUBLIC_GUN_PEERS in env environment required');
}

const NEXT_PUBLIC_GUN_PEERS = process.env.NEXT_PUBLIC_GUN_PEERS.split(',');

interface Props {
  children: React.ReactNode;
}

interface ContextValue {
  getGun: () => any;
  getUser: () => IGunUserInstance | undefined;
  getAccessToken: () => string | undefined;
  setAccessToken: (token: string) => void;
  authenticate: (pair: ISEAPair) => Promise<any>;
  reauthenticateDeck: (deckId: string) => Promise<any>;
  logout: () => void;
  initGunUser: (address: string) => Promise<void>;
  createUser: () => Promise<ISEAPair>;
  isReady: boolean;
  isAuthenticated: boolean;
}

// TODO memo
const GunContext = createContext<ContextValue>({
  getGun: () => undefined,
  getUser: () => undefined,
  getAccessToken: () => undefined,
  setAccessToken: () => {},
  authenticate: () => Promise.resolve(),
  reauthenticateDeck: (deckId: string) => Promise.resolve(null),
  logout: () => {},
  initGunUser: () => Promise.resolve(),
  createUser: () => Promise.resolve({ pub: '', priv: '', epub: '', epriv: '' }),
  isReady: false,
  isAuthenticated: false,
});

export const GunProvider = ({ children }: Props) => {
  const gunRef = useRef<any>();
  const userRef = useRef<any>();
  const accessTokenRef = useRef<string>();
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const initGun = async () => {
      if (!gunRef.current) {
        // @ts-ignore
        Gun.on('opt', ctx => {
          // if (ctx.once) return;

          ctx.on('out', function (msg: any) {
            // @ts-ignore
            const to = this.to;
            // Adds headers for put
            msg.headers = {
              accessToken: accessTokenRef.current,
            };
            to.next(msg); // pass to next middleware

            if (msg.err === 'Invalid access token') {
              // TODO handle invalid access token
              console.error(msg.err);
            }
          });
        });

        gunRef.current = Gun({
          peers: NEXT_PUBLIC_GUN_PEERS,
          // use indexdb instead by including radisk dependencies
          localStorage: false,
          // importing rindexeddb exposes it to window
          store: (window as any).RindexedDB({}),
        });

        // create user
        const res = await fetch('/api/gun');
        const { gun } = await res.json();

        if (gun) {
          userRef.current = gunRef.current.user().auth(gun);
        } else {
          userRef.current = gunRef.current.user();
        }
        // userRef.current = gunRef.current.user();

        accessTokenRef.current = process.env.APP_ACCESS_TOKEN_SECRET;

        setIsReady(true);
      }
    };

    initGun();
  }, []);

  // useEffect(() => {
  //   const getCreds = async () => {
  //     credsRequestCancelTokenRef.current = axios.CancelToken.source();

  //     // get new certificate and token
  //     try {
  //       await Promise.all([
  //         axios
  //           .post(`/api/private/tokens`, sessionUser, {
  //             cancelToken: credsRequestCancelTokenRef.current.token,
  //           })
  //           .then(({ data }) => {
  //             // store token in app memory
  //             accessTokenRef.current = data.accessToken;
  //           }),
  //       ]);
  //     } catch (err) {
  //       console.error(err);
  //     }
  //   };

  //   if (sessionUser) {
  //     getCreds();
  //   }

  //   return () => {
  //     if (credsRequestCancelTokenRef.current?.cancel) {
  //       credsRequestCancelTokenRef.current.cancel();
  //     }
  //   };
  // }, [sessionUser]);

  const initGunUser = async (address: string) => {
    const appPair = JSON.parse(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR!);
    const hashedAddr = await SEA.work(address, appPair, null, { name: 'SHA-256' });
    const storedPair = await gunRef.current.get(`~${appPair.pub}`).get('users').get(hashedAddr).get('pair').then();
    let userPair: ISEAPair;

    if (typeof storedPair === 'undefined') {
      console.log('no stored pair');
      userPair = await createUser();
      const accessControlConditions = [
        {
          contractAddress: '',
          standardContractType: '',
          chain: 'ethereum',
          method: '',
          parameters: [':userAddress'],
          returnValueTest: {
            comparator: '=',
            value: address,
          },
        },
      ];
      const [encryptedStringBase64, encryptedSymmetricKeyBase64] = await encryptWithLit(
        JSON.stringify(userPair),
        accessControlConditions,
      );
      const toStore = await encrypt(
        {
          encryptedString: encryptedStringBase64,
          encryptedSymmetricKey: encryptedSymmetricKeyBase64,
          accessControlConditions: JSON.stringify(accessControlConditions),
        },
        { pair: appPair },
      );

      await authenticate(appPair);
      await gunRef.current.user()?.get('users').get(hashedAddr!).get('pair').put(toStore).then();
    } else {
      console.log('found stored pair');
      const { encryptedString, encryptedSymmetricKey, accessControlConditions } = await decrypt(storedPair, {
        pair: appPair,
      });
      userPair = JSON.parse(await decryptWithLit(encryptedString, encryptedSymmetricKey, accessControlConditions));
    }

    const response = await fetch('/api/gun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sea: userPair }),
    });
    if (!response.ok) throw new Error('Failed to create DECK');

    await authenticate(userPair);
  };

  const createUser = async (): Promise<ISEAPair> => {
    return new Promise(async resolve => {
      const keyPair: ISEAPair = await SEA.pair();

      await new Promise(async resolve => gunRef.current!.user().create(keyPair, resolve));
      resolve(keyPair);
    });
  };

  const authenticate = async (pair: ISEAPair) => {
    // console.log(`authing:`, pair);
    if (!gunRef.current) return;
    await logout();

    return new Promise<void>((resolve, reject) => {
      gunRef.current.user().auth(pair, async ({ err, sea }: any) => {
        if (err) {
          reject(new Error(err));
        }

        setIsAuthenticated(true);
        resolve();
      });
    });
  };

  const reauthenticateDeck = async (deckId: string) => {
    // TODO: how often does this fire?
    console.log('reauthenticateDeck');
    if (!gunRef.current || !process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR) return;

    await authenticate(JSON.parse(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR));
    const encryptedDeck = await gunRef.current.user().get('decks').get(deckId).then();
    const decryptedDeck = await decrypt(encryptedDeck, { pair: JSON.parse(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR) });
    const { encryptedString, encryptedSymmetricKey, accessControlConditions } = decryptedDeck;
    const decryptedDeckKeypair = await decryptWithLit(encryptedString, encryptedSymmetricKey, accessControlConditions);

    return new Promise<void>((resolve, reject) => {
      gunRef.current.user().auth(JSON.parse(decryptedDeckKeypair), ({ err, sea }: any) => {
        if (err) {
          reject(new Error(err));
        }

        setIsAuthenticated(true);
        resolve();
      });
    });
  };

  const logout = async () => {
    accessTokenRef.current = undefined;
    userRef.current?.leave();
    setIsAuthenticated(false);
  };

  return (
    <GunContext.Provider
      value={{
        getGun: () => gunRef.current,
        getUser: () => userRef.current,
        getAccessToken: () => accessTokenRef.current,
        setAccessToken: v => {
          accessTokenRef.current = v;
        },
        isReady,
        isAuthenticated,
        initGunUser,
        createUser,
        authenticate,
        reauthenticateDeck,
        logout,
      }}
    >
      {children}
    </GunContext.Provider>
  );
};

export default function useGun() {
  const context = useContext(GunContext);
  if (context === undefined) {
    throw new Error('useGun must be used within a provider');
  }

  return context;
}
