import { useCallback } from 'react';
import { useRouter } from 'next/router';
import deleteBacklinks from 'editor/backlinks/deleteBacklinks';
import { store, useStore } from 'lib/store';
import { useCurrentDeck } from 'utils/useCurrentDeck';
import { useDeck } from 'utils/ceramic-hooks';

export default function useDeleteNote() {
  const router = useRouter();
  const {
    deck: { id: deckId },
  } = useCurrentDeck();
  const deck = useDeck(deckId);
  const openNoteIds = useStore(state => state.openNoteIds);

  const onDeleteClick = useCallback(
    async (noteId: string) => {
      if (!deck) return;
      const deletedNoteIndex = openNoteIds.findIndex(openNoteId => openNoteId === noteId);

      if (deletedNoteIndex !== -1) {
        // Redirect if one of the notes that was deleted was open
        const noteIds = Object.keys(store.getState().notes);
        // If there are other notes to redirect to, redirect to the first one
        if (noteIds.length > 1) {
          for (const id of noteIds) {
            // We haven't deleted the note yet, so we need to check the id
            if (noteId !== id) {
              router.push(`/app/${deckId}/note/${id}`, undefined, { shallow: true });
              break;
            }
          }
        } else {
          // No note ids to redirect to, redirect to app
          router.push(`/app/${deckId}`);
        }
      }

      const additionalNoteUpdates = await deleteBacklinks(noteId);

      const success = await deck.updateNotes(additionalNoteUpdates, noteId);
      if (!success) {
        return false;
      }

      return true;
    },
    [router, openNoteIds],
  );

  return { onDeleteClick };
}
