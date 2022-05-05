import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { store } from 'lib/store';
import type { PickPartial } from 'types/utils';
import type { Note } from 'types/gun';
import useGun from 'utils/useGun';

export type NoteUpdate = PickPartial<Note, 'content' | 'title' | 'created_at' | 'updated_at'>;

export default function useNotes() {
  const { isReady, isAuthenticated, getGun, getUser, reauthenticateDeck } = useGun();
  // const [notes, setNotes] = useState<any>({});
  // const [notesReady, setNotesReady] = useState<boolean>(false);
  const router = useRouter();
  const {
    query: { deckId },
  } = router;

  // https://stackoverflow.com/questions/43638938/updating-an-object-with-setstate-in-react

  // useEffect(() => {
  //   const getNotes = async () => {
  //     await checkReauthenticate();

  //     const notes: Note[] = [];
  //     await getUser()
  //       ?.get('notes')
  //       .map()
  //       .once(note => {
  //         console.log(note);
  //         if (note) {
  //           notes.push({ ...note, content: JSON.parse(note.content) });
  //         }
  //       })
  //       .then();
  //     console.log('notes', notes);
  //     setNotes(notes);
  //     setNotesReady(true);
  //   };

  //   getNotes();
  // }, []);

  // useEffect(() => {
  //   // const listen = async function (note: any, id: string) {
  //   //   console.log('id', id);
  //   //   console.log('note', { ...note, content: JSON.parse(note.content) });
  //   //   if (!note) {
  //   //     const newNotes = { ...notes };
  //   //     delete newNotes[id];
  //   //     setNotes(newNotes);
  //   //     return;
  //   //   }
  //   //   // const data = await decrypt(note)
  //   //   const data = { ...note, content: JSON.parse(note.content) };
  //   //   const newNote = { [id]: data };
  //   //   const newNotes = { ...notes, newNote };
  //   //   setNotes(newNotes);
  //   // };

  //   getUser()
  //     ?.get('notes')
  //     .map()
  //     // .on(listen)
  //     .on(
  //       (data: any) => {
  //         console.log('on data', data);
  //         if (data) {
  //           // @ts-ignore
  //           setNotes(previousState => ({
  //             ...previousState,
  //             data,
  //           }));
  //           // setNotes({ [data.id]: { ...data, content: JSON.parse(data.content) } });
  //           // setNotes([...notes, { ...data, content: JSON.parse(data.content) }]);
  //         }

  //         if (!notesReady) setNotesReady(true);
  //       },
  //       {
  //         change: true,
  //       },
  //     );
  //   console.log(notes);
  //   return () => {
  //     if (getUser()?.get('notes').off) getUser()?.get('notes').off();
  //   };
  // }, [notesReady, Boolean(notes)]);

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
    await getUser()
      ?.get('notes')
      .map()
      // .on(note => {
      .once(note => {
        if (note) {
          notes.push({ ...note, content: JSON.parse(note.content) });
        }
      })
      .then();

    return notes;
  }, [checkReauthenticate, getUser]);

  const upsertNote = useCallback(
    async (noteTitle: string, noteId: string = '') => {
      await checkReauthenticate();

      const note = {
        id: noteId || uuidv4(),
        title: noteTitle,
        content: JSON.stringify([{ id: uuidv4(), type: 'paragraph', children: [{ text: '' }] }]),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await getUser()?.get('notes').get(note.id).put(note).then();

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

        const note: any = { ...noteUpdate };
        if (note.content) note.content = JSON.stringify(note.content);
        note.updated_at = new Date().toISOString();

        await getUser()?.get('notes').get(note.id).put(note).then();

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
    // notes,
    // notesReady,
    getNotes,
    upsertNote,
    updateNote,
    deleteNote,
  };
}
