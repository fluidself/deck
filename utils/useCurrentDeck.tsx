import { useState, useEffect, useContext, createContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Deck } from 'types/supabase';

type CurrentDeck = {
  // deck: Deck | null;
  deck: { id: string };
};

const CurrentDeckContext = createContext<CurrentDeck | undefined>(undefined);

// function useProvideDeck(deckId: string): CurrentDeck {
//   const [deck, setDeck] = useState<Deck | null>(null);

//   const initDeck = async (deckId: string) => {
//     const res = await fetch('/api/deck', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ deckId }),
//     });
//     const { deck } = await res.json();

//     setDeck(deck);
//   };

//   useEffect(() => {
//     initDeck(deckId);
//   }, []);

//   return {
//     deck,
//   };
// }

export function ProvideCurrentDeck({ children, deckId }: { children: ReactNode; deckId: string }) {
  // const deck = useProvideDeck(deckId);
  const deck = { deck: { id: deckId } };

  return <CurrentDeckContext.Provider value={deck}>{children}</CurrentDeckContext.Provider>;
}

export const useCurrentDeck = () => {
  const context = useContext(CurrentDeckContext);
  if (context === undefined) {
    throw new Error('useCurrentDeck must be used within a provider');
  }
  return context;
};
