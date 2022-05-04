/*
 * Usage example:
 *   import useGunContext from './useGunContext'
 *   // ...
 *   const { getGun, getUser } = useGunContext()
 *
 *   getGun().get('ours').put('this')
 *   getUser().get('mine').put('that')
 */
import axios, { CancelTokenSource } from 'axios';
import React, { createContext, useContext, useRef, useEffect, useState } from 'react';
// import { Layer, Box, Text } from 'grommet';
// import type { IGunChain } from 'gun/types/gun';

import type { IGunUserInstance, ISEAPair } from 'gun/types/sea';
// import type { IGunCryptoKeyPair } from 'gun/types/types';
import Gun from 'gun/gun';
import SEA from 'gun/sea';

// import EnterPasswordForm from 'components/EnterPasswordForm';
// import type { GunUser } from 'utils/profiles';

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
  getCertificate: () => string | undefined;
  setCertificate: (cert: string) => void;
  getAccessToken: () => string | undefined;
  setAccessToken: (token: string) => void;
  // checkIfAccountExists: (id: string) => Promise<any>;
  authenticate: (pair: ISEAPair) => Promise<any>;
  logout: () => void;
  createUser: () => Promise<any>;
  putDeckKeys: () => Promise<any>;
  // createUser: (value: any) => Promise<any>;
  // triggerReauthentication: (username: string) => Promise<void>;
  isReady: boolean;
  isAuthenticated: boolean;
  needsReauthentication: string | undefined;
}

// TODO memo
const GunContext = createContext<ContextValue>({
  getGun: () => undefined,
  getUser: () => undefined,
  getCertificate: () => undefined,
  setCertificate: () => {},
  getAccessToken: () => undefined,
  setAccessToken: () => {},
  // checkIfAccountExists: () => Promise.resolve(),
  authenticate: () => Promise.resolve(),
  logout: () => {},
  createUser: () => Promise.resolve(),
  putDeckKeys: () => Promise.resolve(),
  // triggerReauthentication: () => Promise.resolve(),
  isReady: false,
  isAuthenticated: false,
  needsReauthentication: undefined,
});

export const GunProvider = ({ children, sessionUser }: Props) => {
  const gunRef = useRef<any>();
  const userRef = useRef<any>();
  const certificateRef = useRef<string>();
  const accessTokenRef = useRef<string>();
  const reauthenticationPromiseRef = useRef<{
    resolve: (value: any | PromiseLike<any>) => void;
    reject: (value: any | PromiseLike<any>) => void;
  }>();
  const credsRequestCancelTokenRef = useRef<CancelTokenSource>();
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [needsReauthentication, setNeedsReauthentication] =
    // string: username
    useState<string>();

  useEffect(() => {
    const initGun = async () => {
      await Promise.all([
        import('gun/lib/radix'),
        import('gun/lib/radisk'),
        import('gun/lib/rindexed'),
        import('gun/lib/store'),
        import('gun/lib/then'),
        import('gun/sea'),
      ]);

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
        userRef.current = gunRef.current.user().recall({ sessionStorage: true });
        // userRef.current = gunRef.current.user();

        setIsReady(true);
      }

      // @ts-ignore TODO
      gunRef.current.on('auth', async ({ root, sea, err }) => {
        console.debug('gun user authed', root, sea, err);

        const user: GunUser = {
          id: await new Promise(resolve => {
            gunRef.current
              ?.get(`~${sea.pub}`)
              .get('alias')
              .once((v: any) => {
                // @ts-ignore
                resolve(v);
              });
          }),
          pub: sea.pub,
        };

        if (!err) {
          setIsAuthenticated(true);
        }
      });
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
  //         axios
  //           .post(`/api/private/certificates`, sessionUser, {
  //             cancelToken: credsRequestCancelTokenRef.current.token,
  //           })
  //           .then(({ data }) => {
  //             // store certificate in app memory
  //             // TODO check if expiry isn't working or misconfigured
  //             // TODO handle expired certificates
  //             certificateRef.current = data.certificate;
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

  // const checkIfAccountExists = async (id: string) => {
  //   return new Promise(resolve => {
  //     gunRef.current!.get(`~@${id}`).once((data: any) => {
  //       console.log('checkIfAccountExists', data);
  //       if (typeof data !== 'undefined') {
  //         if (data.err) console.error(data.err);

  //         resolve(true);
  //       } else {
  //         resolve(false);
  //       }
  //     });
  //   });
  // };

  const createUser = async () => {
    return new Promise(async resolve => {
      const keyPair: ISEAPair = await SEA.pair();

      await new Promise(async resolve => gunRef.current!.user().create(keyPair, resolve));
      resolve(keyPair);
      // gunRef.current!.user().auth(keyPair, ({ err, sea }: any) => resolve(sea.pub));
    });
  };

  const putDeckKeys = async () => {
    console.log(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR);
    // await gunRef.current!.get('#spacenamehere213123').get('uuid-asda39-123asd-asd').put('encrypted-string-here').then();
    // await gunRef
    //   .current!.get('#spacenamehere213123')
    //   .get('uuid-asda39-123asd-asd')
    //   .map()
    //   .once((data: any) => {
    //     console.log(data);
    //     gunRef.current!.get(data).once((d: any) => console.log(d));
    //   });
  };

  // const createUser = async (user: { id: string; gun_key: string }) => {
  //   console.log('createUser', user);

  //   return new Promise((resolve, reject) => {
  //     gunRef.current!.user().create(user.id, user.gun_key, ({ err, pub }: any) => {
  //       // console.log(err, pub);
  //       if (err) {
  //         console.error(err);
  //         reject(false);
  //       } else {
  //         resolve(true);
  //       }
  //     });
  //   });
  // };

  const authenticate = async (pair: ISEAPair) => {
    if (!gunRef.current) return;
    await logout();

    return new Promise<void>((resolve, reject) => {
      gunRef.current.user().auth(pair, ({ err, sea }: any) => {
        if (err) {
          reject(new Error(err));
        }

        resolve();
      });
    });
  };

  const logout = async () => {
    certificateRef.current = undefined;
    accessTokenRef.current = undefined;

    userRef.current?.leave();

    setIsAuthenticated(false);

    // await fetch('/api/signout', {
    //   method: 'POST',
    // });
  };

  // const triggerReauthentication = (username: string): Promise<void> => {
  //   reauthenticationPromiseRef.current = undefined;

  //   if (!username) {
  //     return Promise.reject(new Error('Username required'));
  //   }

  //   setNeedsReauthentication(username);

  //   return new Promise((resolve, reject) => {
  //     reauthenticationPromiseRef.current = {
  //       resolve: arg => {
  //         setNeedsReauthentication(undefined);

  //         reauthenticationPromiseRef.current = undefined;
  //         resolve(arg);
  //       },
  //       reject: arg => {
  //         reauthenticationPromiseRef.current = undefined;
  //         reject(arg);
  //       },
  //     };
  //   });
  // };

  // const handleSubmitPassphrase = ({ passphrase }: any) => {
  //   if (needsReauthentication) {
  //     userRef.current?.auth(needsReauthentication, passphrase, ({ err, sea }: any) => {
  //       if (err && reauthenticationPromiseRef.current?.reject) {
  //         reauthenticationPromiseRef.current.reject(new Error('Could not log inn'));
  //       } else {
  //         if (reauthenticationPromiseRef.current?.resolve) {
  //           reauthenticationPromiseRef.current.resolve({
  //             username: needsReauthentication,
  //             pub: sea.pub,
  //           });
  //         }
  //       }
  //     });
  //   }
  // };

  return (
    <GunContext.Provider
      value={{
        getGun: () => gunRef.current,
        getUser: () => userRef.current,
        getCertificate: () => certificateRef.current,
        setCertificate: v => {
          certificateRef.current = v;
        },
        getAccessToken: () => accessTokenRef.current,
        setAccessToken: v => {
          accessTokenRef.current = v;
        },
        isReady,
        isAuthenticated,
        needsReauthentication,
        // checkIfAccountExists,
        logout,
        authenticate,
        createUser,
        putDeckKeys,
        // triggerReauthentication,
      }}
    >
      {children}

      {/* {needsReauthentication && (
        <Layer
          onClickOutside={() => setNeedsReauthentication(undefined)}
          onEsc={() => setNeedsReauthentication(undefined)}
        >
          <Box pad="medium" gap="small">
            <Text>Re-enter your passphrase to continue</Text>

            <EnterPasswordForm onSubmit={handleSubmitPassphrase} />
          </Box>
        </Layer>
      )} */}
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

// https://github.com/amark/gun/wiki/Snippets#saving-arrays-in-gun
export const getIndexedObjectFromArray = (arr: any[]) => {
  return arr.reduce((acc, item) => {
    return {
      ...acc,
      [item.id]: item,
    };
  }, {});
};

export const getArrayFromIndexedObject = (indexedObj: any) => {
  return Object.values(indexedObj);
};
