import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { store } from 'lib/store';
import type { PickPartial } from 'types/utils';
import type { Note } from 'types/gun';
import useGun from 'utils/useGun';
import { encrypt, decrypt } from 'utils/encryption';

export type NoteUpdate = PickPartial<Note, 'content' | 'title' | 'created_at' | 'updated_at'>;

export default function useNotes() {
  const { isReady, isAuthenticated, getGun, getUser, reauthenticateDeck } = useGun();
  // const [notes, setNotes] = useState<any>({});
  // const [notesReady, setNotesReady] = useState<boolean>(false);
  const router = useRouter();
  const {
    query: { deckId },
  } = router;

  // TODO: move .on handlers from AppLayout into useEffect here?
  // https://gun.eco/docs/API#-a-name-on-a-gun-on-callback-option-
  // https://stackoverflow.com/questions/43638938/updating-an-object-with-setstate-in-react
  // useEffect(() => {})

  // we may need to reauthenticate if session was loaded from the server
  const checkReauthenticate = async () => {
    if (!deckId || typeof deckId !== 'string') return;
    const gunUser = getUser()?.is;

    if (!gunUser) {
      try {
        console.log('reauthenticating DECK');
        await reauthenticateDeck(deckId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getNotes = useCallback(async () => {
    await checkReauthenticate();

    const notes: Note[] = [];
    // @ts-ignore
    const pair = getUser()?._.sea;
    await getUser()
      ?.get('notes')
      .map()
      .once(async note => {
        if (note) {
          const decryptedNote = await decrypt(note, { pair });
          notes.push(decryptedNote);
        }
      })
      .then();

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

      // TODO: let Gun .on listener handle this alone?
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

        // TODO: let Gun .on listener handle this alone?
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
      // store.getState().deleteNote(noteId);

      await getUser()?.get('notes').get(noteId).put(null).then();

      await getUser()?.get('note_tree').put(JSON.stringify(store.getState().noteTree)).then();
    },
    [checkReauthenticate, getUser],
  );

  return {
    // notes,
    // notesReady,
    getNotes,
    upsertNote,
    updateNote,
    deleteNote,
  };
}
