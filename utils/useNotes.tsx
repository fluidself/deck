import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { store, useStore } from 'lib/store';
import type { PickPartial } from 'types/utils';
import type { Note } from 'types/gun';
import { encrypt, decrypt } from 'utils/encryption';
import useGun from 'utils/useGun';

export type NoteUpdate = PickPartial<Note, 'content' | 'title' | 'created_at' | 'updated_at'>;

export default function useNotes() {
  const { getUser, reauthenticateDeck, isAuthenticated } = useGun();
  const [notesReady, setNotesReady] = useState<boolean>(false);
  const router = useRouter();
  const {
    query: { deckId },
  } = router;

  const upsertStoreNote = useStore(state => state.upsertNote);
  const updateStoreNote = useStore(state => state.updateNote);
  const deleteStoreNote = useStore(state => state.deleteNote);

  useEffect(() => {
    const initData = async () => {
      await checkReauthenticate();

      getUser()
        ?.get('notes')
        .map()
        .on(
          async (note: any, id: string) => {
            // @ts-ignore
            const pair = getUser()?._.sea;
            if (!pair) return;
            const storeNotes = Object.keys(store.getState().notes);
            const openNoteIds = store.getState().openNoteIds;
            if (id && note) {
              // Note is new
              if (!storeNotes.includes(id)) {
                // console.log(`upsert note ${id}`);
                const decryptedNote = await decrypt(note, { pair });
                upsertStoreNote(decryptedNote);
              } else {
                // TODO: fires very often. Can I narrow it down or improve puts?
                // Note is updated?
                // Don't update the note if it is currently open
                if (storeNotes.includes(id) && !openNoteIds.includes(id)) {
                  // console.log(`update note ${id}`);
                  const decryptedNote = await decrypt(note, { pair });
                  updateStoreNote(decryptedNote);
                }
              }
            } else if (id && !note) {
              // Note is deleted
              if (storeNotes.includes(id)) {
                // console.log(`delete note ${id}`);
                deleteStoreNote(id);
              }
            }
          },
          { change: true },
        );
    };

    initData();
    // TODO: better way to handle this
    setTimeout(() => setNotesReady(true), 300);

    return () => {
      getUser()?.get('notes').off();
    };
  }, [getUser, deckId, setNotesReady, isAuthenticated]);

  // we may need to reauthenticate if session was loaded from the server
  const checkReauthenticate = async () => {
    if (!deckId || typeof deckId !== 'string') return;
    const gunUser = getUser()?.is;

    if (!gunUser) {
      try {
        await reauthenticateDeck(deckId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getNotes = useCallback(async () => {
    await checkReauthenticate();

    const notes: any = {};
    getUser()
      ?.get('notes')
      .map()
      .once(async (note: any, id: string) => {
        // @ts-ignore
        const pair = getUser()?._.sea;
        if (!pair) return;
        if (id && note) {
          const decryptedNote = await decrypt(note, { pair });
          notes[decryptedNote.id] = decryptedNote;
        }
      });

    return notes;
  }, [checkReauthenticate, getUser]);

  const upsertNote = useCallback(
    async (noteTitle: string, noteId: string = '') => {
      await checkReauthenticate();

      // @ts-ignore
      const pair = getUser()?._.sea;
      const note = {
        id: noteId || uuidv4(),
        title: noteTitle,
        content: JSON.stringify([{ id: uuidv4(), type: 'paragraph', children: [{ text: '' }] }]),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const encryptedNote = await encrypt(note, { pair });
      await getUser()?.get('notes').get(note.id).put(encryptedNote).then();

      // Refresh the list of notes in the sidebar
      store.getState().upsertNote({ ...note, content: JSON.parse(note.content) });

      await getUser()?.get('note_tree').put(JSON.stringify(store.getState().noteTree)).then();

      return note.id;
    },
    [checkReauthenticate, getUser],
  );

  const updateNote = useCallback(
    async (noteUpdate: NoteUpdate) => {
      try {
        await checkReauthenticate();

        // @ts-ignore
        const pair = getUser()?._.sea;
        const note: any = { ...noteUpdate };
        if (note.content) note.content = JSON.stringify(note.content);
        note.updated_at = new Date().toISOString();
        const encryptedNote = await encrypt(note, { pair });
        await getUser()?.get('notes').get(note.id).put(encryptedNote).then();

        // Update updated_at locally
        store.getState().updateNote({ id: note.id, updated_at: note.updated_at });
      } catch (error) {
        console.error(error);
      }
    },
    [checkReauthenticate, getUser],
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      await checkReauthenticate();

      // Update note titles in sidebar
      store.getState().deleteNote(noteId);

      await getUser()?.get('notes').get(noteId).put(null).then();

      await getUser()?.get('note_tree').put(JSON.stringify(store.getState().noteTree)).then();
    },
    [checkReauthenticate, getUser],
  );

  return {
    notesReady,
    getNotes,
    upsertNote,
    updateNote,
    deleteNote,
  };
}
