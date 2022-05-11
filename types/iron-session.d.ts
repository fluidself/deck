import { ISEAPair } from 'gun';
import { SiweMessage } from 'siwe';
import { User, Deck } from 'types/supabase';

declare module 'iron-session' {
  interface IronSessionData {
    siwe?: SiweMessage;
    nonce?: string;
    user?: User;
    allowedDeck?: string;
    gun?: ISEAPair;
    deck?: {
      id: string;
      pair: any;
    };
  }
}
