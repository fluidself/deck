import Head from 'next/head';
import Router from 'next/router';
import { ToastContainer } from 'react-toastify';
import NProgress from 'nprogress';
import type { AppProps } from 'next/app';
import { Provider, defaultChains } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { providers } from 'ethers';
import { ProvideAuth } from 'utils/useAuth';
import { GunProvider } from 'utils/useGun';
import AppLayout from 'components/AppLayout';
import ServiceWorker from 'components/ServiceWorker';
import 'styles/globals.css';
import 'styles/nprogress.css';
import 'react-toastify/dist/ReactToastify.css';
import 'tippy.js/dist/tippy.css';

Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', () => NProgress.done());

const infuraId = process.env.NEXT_PUBLIC_INFURA_ID as string;
const chains = defaultChains;

type Config = { chainId?: number };

const connectors = ({ chainId }: Config) => {
  return [new InjectedConnector({ chains })];
};

const provider = ({ chainId }: Config) => new providers.InfuraProvider(chainId, infuraId);

export default function MyApp({ Component, pageProps, router }: AppProps) {
  return (
    <>
      <Head>
        <title>DECK</title>
        <meta name="description" content="Decentralized and Encrypted Collaborative Knowledge" />
        <meta name="viewport" content="initial-scale=1, width=device-width" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" />
        <meta name="msapplication-TileColor" content="#da532c" />
        <meta name="theme-color" content="#ffffff"></meta>
      </Head>
      <ServiceWorker>
        <Provider autoConnect connectors={connectors} provider={provider}>
          <GunProvider sessionUser={pageProps.user}>
            <ProvideAuth>
              {router.pathname.startsWith('/app/') ? (
                <AppLayout>
                  <Component {...pageProps} />
                </AppLayout>
              ) : (
                <Component {...pageProps} />
              )}
            </ProvideAuth>
          </GunProvider>
        </Provider>
      </ServiceWorker>
      <ToastContainer position="top-center" hideProgressBar newestOnTop={true} theme="colored" />
    </>
  );
}
