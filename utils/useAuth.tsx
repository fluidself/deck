import { useState, useEffect, useContext, createContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useConnect } from 'wagmi';
import { SiweMessage } from 'siwe';
import useGun from 'utils/useGun';
import { User } from 'types/supabase';

type AuthContextType = {
  isLoaded: boolean;
  user: User | null;
  // signIn: (address: string, chainId: string) => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

function useProvideAuth(): AuthContextType {
  const [
    {
      data: { connectors },
      error,
    },
    connect,
  ] = useConnect();
  const {
    getGun,
    getUser,
    // setCertificate,
    // getCertificate,
    setAccessToken,
    checkIfAccountExists,
    login,
    logout,
    createUser,
  } = useGun();
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [signingIn, setSigningIn] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  const initUser = async () => {
    const res = await fetch('/api/user');
    const { user } = await res.json();

    setUser(user);
    setIsLoaded(true);
  };

  useEffect(() => {
    initUser();

    window.addEventListener('focus', initUser);
    return () => window.removeEventListener('focus', initUser);
  }, []);

  const signIn = useCallback(async () => {
    setSigningIn(true);

    try {
      const connector = connectors[0];
      const res = await connect(connector);
      if (!res.data) throw res.error ?? new Error('Unable to connect');

      const address = res.data.account;
      const nonceResponse = await fetch('/api/nonce');
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in with Ethereum to use DECK',
        uri: window.location.origin,
        version: '1',
        chainId: res.data.chain?.id,
        nonce: await nonceResponse.text(),
      });

      const signer = await connector.getSigner();
      const signature = await signer.signMessage(message.prepareMessage());

      const verificationResponse = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, signature }),
      });
      if (!verificationResponse.ok) throw new Error('Error verifying message');

      // await initUser();
      const userRes = await fetch('/api/user');
      const { user } = await userRes.json();

      const accountExists = await checkIfAccountExists(user.id);
      console.log('accountExists', accountExists);

      if (accountExists) {
        const loginRes = await login(user);
        console.log('loginRes', loginRes);
      } else {
        const success = await createUser(user);
        console.log('createUserRes', success);
        if (success) {
          const loginRes = await login(user);
          console.log('loginRes', loginRes);
        }
      }

      setSigningIn(false);
      router.push('/app');
    } catch (e) {
      console.error(e);
    }
  }, []);

  const signOut = async () => {
    await fetch('/api/signout', {
      method: 'POST',
    });
    await initUser();
  };

  return {
    isLoaded: isLoaded && !signingIn,
    user,
    signIn,
    signOut,
  };
}

export function ProvideAuth({ children }: { children: ReactNode }) {
  const auth = useProvideAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a provider');
  }

  return context;
};
