import { RequestClient, RequestState } from '@self.id/framework';
import { CERAMIC_NETWORK } from 'constants/ceramic';
import model from '../model.json';
import type { ModelTypes } from 'types/ceramic';

export function createRequestClient(cookie: string | undefined): RequestClient<ModelTypes> {
  return new RequestClient({
    ceramic: CERAMIC_NETWORK,
    cookie,
    model,
  });
}

export default async function getRequestState(cookie: string | undefined): Promise<RequestState> {
  const requestClient = createRequestClient(cookie);
  const prefetch = [];

  if (requestClient.viewerID != null) {
    prefetch.push(requestClient.prefetch('basicProfile', requestClient.viewerID));
    prefetch.push(requestClient.prefetch('decks', requestClient.viewerID));
  }

  await Promise.all([prefetch]);

  return requestClient.getState();
}
