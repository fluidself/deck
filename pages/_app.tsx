import Head from 'next/head';
import Router from 'next/router';
import { ToastContainer } from 'react-toastify';
import NProgress from 'nprogress';
import type { AppProps } from 'next/app';
import type { ModelTypesToAliases } from '@glazed/types';
import { Provider as SelfIDProvider } from '@self.id/framework';
import closeIcon from '@self.id/multiauth/assets/icon-close.svg';
import selectedIcon from '@self.id/multiauth/assets/icon-selected.svg';
import ethereumLogo from '@self.id/multiauth/assets/ethereum.png';
import metaMaskLogo from '@self.id/multiauth/assets/metamask.png';
// import { ProvideAuth } from 'utils/useAuth';
import AppLayout from 'components/AppLayout';
import ServiceWorker from 'components/ServiceWorker';
import { CERAMIC_NETWORK } from 'constants/ceramic';
import publishedModel from '../model.json';
import type { ModelTypes } from 'types/ceramic';
import 'styles/globals.css';
import 'styles/nprogress.css';
import 'react-toastify/dist/ReactToastify.css';
import 'tippy.js/dist/tippy.css';

Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', () => NProgress.done());

const model: ModelTypesToAliases<ModelTypes> = publishedModel;

export default function MyApp({ Component, pageProps, router }: AppProps) {
  const { state, ...props } = pageProps;

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
        <SelfIDProvider
          auth={{
            modal: { closeIcon: closeIcon.src, selectedIcon: selectedIcon.src },
            networks: [
              {
                key: 'ethereum',
                logo: ethereumLogo.src,
                connectors: [{ key: 'injected', logo: metaMaskLogo.src }],
              },
            ],
          }}
          client={{ ceramic: CERAMIC_NETWORK, model }}
          state={state}
        >
          {/* <ProvideAuth> */}
          {router.pathname.startsWith('/app/') ? (
            <AppLayout>
              <Component {...props} />
            </AppLayout>
          ) : (
            <Component {...props} />
          )}
          {/* </ProvideAuth> */}
        </SelfIDProvider>
      </ServiceWorker>
      <ToastContainer position="top-center" hideProgressBar newestOnTop={true} theme="colored" />
    </>
  );
}
