import { useCallback } from 'react';
import { useRouter } from 'next/router';
import deleteBacklinks from 'editor/backlinks/deleteBacklinks';
import supabase from 'lib/supabase';
import { store, useStore } from 'lib/store';
import type { NoteItem } from 'types/ceramic';
import type { Workspace } from 'types/supabase';
import { useCurrentDeck } from 'utils/useCurrentDeck';
import { useCurrentWorkspace } from 'utils/useCurrentWorkspace';
import useDeck from 'utils/useDeck';

export default function useDeleteNote() {
  const router = useRouter();
  const currentDeck = useCurrentDeck();
  const { workspace } = useCurrentWorkspace();
  const deck = useDeck(currentDeck.deck?.id);
  const openNoteIds = useStore(state => state.openNoteIds);
  const updateNote = useStore(state => state.updateNote);
  const deleteNote = useStore(state => state.deleteNote);

  const onDeleteClick = useCallback(
    async (noteId: string) => {
      if (!deck || !workspace) return;
      const deletedNoteIndex = openNoteIds.findIndex(openNoteId => openNoteId === noteId);

      if (deletedNoteIndex !== -1) {
        // Redirect if one of the notes that was deleted was open
        const noteIds = Object.keys(store.getState().notes);
        // If there are other notes to redirect to, redirect to the first one
        if (noteIds.length > 1) {
          for (const id of noteIds) {
            // We haven't deleted the note yet, so we need to check the id
            if (noteId !== id) {
              router.push(`/app/${workspace.id}/note/${id}`, undefined, { shallow: true });
              break;
            }
          }
        } else {
          // No note ids to redirect to, redirect to app
          router.push(`/app/${workspace.id}`);
        }
      }

      const additionalNoteUpdates = await deleteBacklinks(noteId);

      const success = await deck.updateNotes(additionalNoteUpdates, noteId);
      if (!success) {
        return false;
      }

      // Don't update the note if it is currently open
      if (additionalNoteUpdates.length) {
        additionalNoteUpdates.forEach((noteUpdate: NoteItem) => {
          if (!openNoteIds.includes(noteUpdate.id)) {
            updateNote({ ...noteUpdate, content: noteUpdate.content });
          }
        });
      }

      const { data: workspaceNotes } = await supabase
        .from<Workspace>('workspaces')
        .select('notes')
        .eq('id', workspace.id)
        .single();
      if (!workspaceNotes) return false;

      const { data, error } = await supabase
        .from<Workspace>('workspaces')
        .update({ notes: workspaceNotes.notes.filter(id => id !== noteId), note_tree: store.getState().noteTree })
        .eq('id', workspace.id);
      if (!data || error) {
        return false;
      }

      deleteNote(noteId);

      return true;
    },
    [router, openNoteIds],
  );

  return { onDeleteClick };
}
