import { useState, useEffect, useContext, createContext } from 'react';
import type { ReactNode } from 'react';
import { useViewerRecord } from '@self.id/framework';
import type { ModelTypes, DeckItem } from 'types/ceramic';

type CurrentDeck = {
  deck: DeckItem;
};

const DeckContext = createContext<CurrentDeck | undefined>(undefined);

function useProvideDeck(deckId: string): CurrentDeck {
  const [deck, setDeck] = useState<DeckItem>({ id: deckId, deck_name: '' });
  const decksRecord = useViewerRecord<ModelTypes, 'decks'>('decks');

  useEffect(() => {
    if (decksRecord.content) {
      const decks = decksRecord.content.decks.map(deck => ({ ...deck, id: deck.id.replace('ceramic://', '') })) ?? [];
      const deck = decks.find(deck => deck.id === deckId);

      if (deck) {
        setDeck(deck);
      }
    }
  }, [decksRecord.content]);

  return { deck };
}

export function ProvideCurrentDeck({ children, deckId }: { children: ReactNode; deckId: string }) {
  const deck = useProvideDeck(deckId);
  return <DeckContext.Provider value={deck}>{children}</DeckContext.Provider>;
}

export const useCurrentDeck = () => {
  const context = useContext(DeckContext);
  if (context === undefined) {
    throw new Error('useCurrentDeck must be used within a provider');
  }
  return context;
};
