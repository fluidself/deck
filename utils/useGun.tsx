import React, { createContext, useContext, useRef, useEffect, useState } from 'react';
import type { IGunUserInstance, ISEAPair } from 'gun/types/sea';
import Gun from 'gun/gun';
import SEA from 'gun/sea';
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/rindexed';
import 'gun/lib/store';
import 'gun/lib/then';
import { decryptWithLit } from 'utils/encryption';

interface GunUser {
  id: string;
  pub: string;
}

if (!process.env.NEXT_PUBLIC_GUN_PEERS) {
  throw new Error('NEXT_PUBLIC_GUN_PEERS in env environment required');
}

const NEXT_PUBLIC_GUN_PEERS = process.env.NEXT_PUBLIC_GUN_PEERS.split(',');

interface Props {
  children: React.ReactNode;
  sessionUser?: GunUser;
}

interface ContextValue {
  getGun: () => any;
  getUser: () => IGunUserInstance | undefined;
  getAccessToken: () => string | undefined;
  setAccessToken: (token: string) => void;
  authenticate: (pair: ISEAPair) => Promise<any>;
  reauthenticateDeck: (deckId: string) => Promise<void>;
  logout: () => void;
  createUser: () => Promise<any>;
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
  reauthenticateDeck: (deckId: string) => Promise.resolve(),
  logout: () => {},
  createUser: () => Promise.resolve(),
  isReady: false,
  isAuthenticated: false,
});

export const GunProvider = ({ children, sessionUser }: Props) => {
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

        // TODO: Radix sometimes undefined breaks this
        gunRef.current = Gun({
          peers: NEXT_PUBLIC_GUN_PEERS,
          // use indexdb instead by including radisk dependencies
          localStorage: false,
          // importing rindexeddb exposes it to window
          store: (window as any).RindexedDB({}),
        });

        // create user
        userRef.current = gunRef.current.user().recall({ sessionStorage: true });

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

  const createUser = async () => {
    return new Promise(async resolve => {
      const keyPair: ISEAPair = await SEA.pair();

      await new Promise(async resolve => gunRef.current!.user().create(keyPair, resolve));
      resolve(keyPair);
    });
  };

  const authenticate = async (pair: ISEAPair) => {
    if (!gunRef.current) return;
    await logout();

    return new Promise<void>((resolve, reject) => {
      gunRef.current.user().auth(pair, ({ err, sea }: any) => {
        if (err) {
          reject(new Error(err));
        }

        setIsAuthenticated(true);
        resolve();
      });
    });
  };

  const reauthenticateDeck = async (deckId: string) => {
    if (!gunRef.current || !process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR) return;

    await authenticate(JSON.parse(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR));

    const deckToAccess = await gunRef.current.user().get(`deck/${deckId}`).then();
    const { encryptedString, encryptedSymmetricKey, accessControlConditions } = deckToAccess;
    const decryptedDeckKeypair = await decryptWithLit(
      encryptedString,
      encryptedSymmetricKey,
      JSON.parse(accessControlConditions),
    );

    return new Promise<void>((resolve, reject) => {
      gunRef.current.user().auth(decryptedDeckKeypair, ({ err, sea }: any) => {
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
