import type { StreamMetadata } from '@ceramicnetwork/common';
import type { TileDocument } from '@ceramicnetwork/stream-tile';
import { PublicID, useConnection, useCore, usePublicRecord, useViewerID, useViewerRecord } from '@self.id/framework';
import type { PublicRecord } from '@self.id/framework';
// import { useAtom } from 'jotai';
// import { useResetAtom } from 'jotai/utils';
import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { store } from 'lib/store';

// import { draftNoteAtom, editionStateAtom } from './state';
import type { ModelTypes, Deck, Decks } from 'types/ceramic';

export type TileDoc<ContentType> = {
  isLoading: boolean;
  content?: ContentType;
  metadata?: StreamMetadata;
  isError: boolean;
  error?: unknown;
  isController: boolean;
  isMutable: boolean;
  isMutating: boolean;
  update(content: ContentType): Promise<void>;
};

export function useTileDoc<ContentType>(id: string): TileDoc<ContentType> {
  const queryClient = useQueryClient();
  const core = useCore();
  const viewerID = useViewerID();

  const {
    data: doc,
    isLoading,
    isError,
    error,
  } = useQuery<TileDocument<ContentType>>(id, async () => await core.tileLoader.load<ContentType>(id));

  const isController = viewerID != null && doc?.metadata.controllers[0] === viewerID.id;

  const updateMutation = useMutation(
    async (content: ContentType) => {
      if (viewerID == null || viewerID instanceof PublicID || doc == null) {
        throw new Error('Cannot mutate record');
      }
      await doc.update(content);
      return doc;
    },
    {
      onSuccess: (doc: TileDocument<ContentType>) => {
        queryClient.setQueryData(id, doc);
      },
    },
  );

  return {
    content: doc?.content,
    metadata: doc?.metadata,
    error,
    isLoading,
    isError,
    isController,
    isMutable: isController && !(viewerID instanceof PublicID),
    isMutating: updateMutation.isLoading,
    update: async (content: ContentType) => {
      await updateMutation.mutateAsync(content);
    },
  };
}

export function useDeckRecord(did: string): PublicRecord<Decks | null> {
  return usePublicRecord<ModelTypes, 'decks'>('decks', did);
}

// export function useDraftNote() {
//   const connect = useConnection<ModelTypes>()[1];
//   const notesRecord = useViewerRecord<ModelTypes, 'notes'>('notes');
//   const [value, setValue] = useAtom(draftNoteAtom);
//   const resetValue = useResetAtom(draftNoteAtom);
//   const [state, setState] = useAtom(editionStateAtom);

//   const isValid = value.text !== '' && value.title !== '';

//   const publish = useCallback(async () => {
//     if (!notesRecord.isLoadable || state.status === 'loading' || !isValid) {
//       return false;
//     }
//     setState({ status: 'loading' });

//     try {
//       const selfID = await connect();
//       if (selfID == null) {
//         setState({ status: 'pending' });
//         return false;
//       }

//       const doc = await selfID.client.dataModel.createTile('Note', {
//         date: new Date().toISOString(),
//         text: value.text,
//       });
//       const notes = notesRecord.content?.notes ?? [];
//       await notesRecord.set({ notes: [...notes, { id: doc.id.toUrl(), title: value.title }] });

//       const notePage = `/${selfID.id}/${doc.id.toString()}`;
//       setState({ status: 'done', notePage });
//       return notePage;
//     } catch (error) {
//       setState({ status: 'failed', error });
//     }
//   }, [connect, isValid, state, setState, value]);

//   return { isValid, publish, resetValue, setValue, state, value };
// }

export function useNote(did: string, id: string) {
  const connect = useConnection<ModelTypes>()[1];
  const deckRecord = useViewerRecord<ModelTypes, 'deck'>('deck');
  const noteDoc = useTileDoc<Note>(id);
  // const [editingText, setEditingText] = useState<string>('');
  const [editionState, setEditionState] = useState<EditionState | null>(null);

  // const isValid = editingText !== '';
  const noteItem = deckRecord.content?.notes?.find(item => item.id === `ceramic://${id}`);
  // const content =
  //   noteDoc.content == null || noteItem == null ? null : { title: noteItem.title, content: noteDoc.content.content };
  const content = noteDoc.content;
  const isEditable = content != null && noteDoc.isController;
  const isEditing = editionState != null;

  // const resetEditingText = useCallback(() => {
  //   setEditingText(content?.text ?? '');
  // }, [content]);

  // const toggleEditing = useCallback(
  //   (editing: boolean = !isEditing) => {
  //     if (editing) {
  //       resetEditingText();
  //       setEditionState({ status: 'pending' });
  //     } else {
  //       setEditionState(null);
  //     }
  //   },
  //   [isEditing, resetEditingText, setEditionState],
  // );

  const update = useCallback(
    async editingText => {
      console.log('noteDoc', noteDoc);
      console.log('deckRecord', deckRecord);
      console.log(editingText);
      if (noteDoc.content == null || !deckRecord.content || !noteItem) {
        return false;
      }
      setEditionState({ status: 'loading' });

      try {
        // todo: viewerID to avoid this connect call?
        const selfID = await connect();
        if (selfID == null) {
          setEditionState({ status: 'pending' });
          return false;
        }

        // if (editingText !== noteDoc.content.content) {
        const updatedAt = new Date().toISOString();
        const updatedContent = JSON.stringify(editingText);
        await noteDoc.update({ ...noteDoc.content, updated_at: updatedAt, content: updatedContent });
        const notes = (deckRecord.content?.notes ?? []).filter(item => item.id !== `ceramic://${id}`);
        noteItem.updated_at = updatedAt;
        noteItem.content = updatedContent;
        console.log('filtered notes', notes);
        console.log('noteItem', noteItem);
        await deckRecord.set({ ...deckRecord.content, notes: [...notes, noteItem] });
        // }
        setEditionState(null);
        return true;
      } catch (error) {
        setEditionState({ status: 'failed', error });
      }
    },
    [connect, editionState, noteDoc, setEditionState],
  );

  return {
    isEditable,
    isEditing,
    isError: deckRecord.isError || noteDoc.isError,
    isLoading: deckRecord.isLoading || noteDoc.isLoading,
    isMutable: noteDoc.isMutable,
    isMutating: noteDoc.isMutating,
    // isValid,
    content,
    // editingText,
    error: deckRecord.error ?? noteDoc.error,
    // resetEditingText,
    // setEditingText,
    // toggleEditing,
    update,
  };
}

export function useDeck(id: string) {
  const [connection, connect] = useConnection<ModelTypes>();
  const deckDoc = useTileDoc<Deck>(id);

  const content = deckDoc.content;
  const isEditable = deckDoc.isController;

  // TODO: DRY up these?
  // TODO: handle errors / loading state?

  const addNote = useCallback(
    async newNote => {
      if (connection.status !== 'connected') await connect();
      if (!deckDoc.content?.notes?.length || !newNote) return false;

      try {
        await deckDoc.update({ ...deckDoc.content, notes: [...deckDoc.content.notes, newNote] });

        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
    [deckDoc, connection, connect],
  );

  const updateNote = useCallback(
    async noteUpdate => {
      if (connection.status !== 'connected') await connect();
      if (!deckDoc.content?.notes?.length || !noteUpdate) return false;

      try {
        const otherNotes = deckDoc.content.notes.filter(note => note.id !== noteUpdate.id);
        console.log('noteUpdate', noteUpdate);
        await deckDoc.update({ ...deckDoc.content, notes: [...otherNotes, noteUpdate] });

        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
    [deckDoc, connection, connect],
  );

  const deleteNote = useCallback(
    async noteId => {
      if (connection.status !== 'connected') await connect();
      if (!deckDoc.content?.notes?.length || !noteId) return false;

      try {
        const remainingNotes = deckDoc.content.notes.filter(note => note.id !== noteId);

        await deckDoc.update({ ...deckDoc.content, notes: remainingNotes, note_tree: JSON.stringify(store.getState().noteTree) });

        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
    [deckDoc, connection, connect],
  );

  const updateNoteTree = useCallback(async () => {
    if (connection.status !== 'connected') await connect();
    if (!deckDoc.content?.notes?.length) return false;

    try {
      await deckDoc.update({ ...deckDoc.content, note_tree: JSON.stringify(store.getState().noteTree) });

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }, [deckDoc, connection, connect]);

  // const update = useCallback(
  //   async editingText => {
  //     console.log('deckDoc', deckDoc);
  //     console.log(editingText);

  //     if (deckDoc.content == null || !noteItem) {
  //       return false;
  //     }
  //     // setEditionState({ status: 'loading' });

  //     try {
  //       // todo: viewerID to avoid this connect call?
  //       const selfID = await connect();
  //       if (selfID == null) {
  //         // setEditionState({ status: 'pending' });
  //         return false;
  //       }

  //       // if (editingText !== noteDoc.content.content) {
  //       const updatedAt = new Date().toISOString();
  //       const updatedContent = JSON.stringify(editingText);
  //       await noteDoc.update({ ...noteDoc.content, updated_at: updatedAt, content: updatedContent });
  //       const notes = (deckRecord.content?.notes ?? []).filter(item => item.id !== `ceramic://${id}`);
  //       noteItem.updated_at = updatedAt;
  //       noteItem.content = updatedContent;
  //       console.log('filtered notes', notes);
  //       console.log('noteItem', noteItem);
  //       await deckRecord.set({ ...deckRecord.content, notes: [...notes, noteItem] });
  //       // }
  //       setEditionState(null);
  //       return true;
  //     } catch (error) {
  //       setEditionState({ status: 'failed', error });
  //     }
  //   },
  //   [connect, editionState, noteDoc, setEditionState],
  // );

  return {
    isEditable,
    // isEditing,
    isError: deckDoc.isError,
    isLoading: deckDoc.isLoading,
    isMutable: deckDoc.isMutable,
    isMutating: deckDoc.isMutating,
    // isValid,
    content,
    // editingText,
    error: deckDoc.error,
    // resetEditingText,
    // setEditingText,
    // toggleEditing,
    // update,
    addNote,
    updateNote,
    deleteNote,
    updateNoteTree,
  };
}
