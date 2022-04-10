import type { StreamMetadata } from '@ceramicnetwork/common';
import type { TileDocument } from '@ceramicnetwork/stream-tile';
import { PublicID, useConnection, useCore, usePublicRecord, useViewerID, useViewerRecord } from '@self.id/framework';
import type { PublicRecord } from '@self.id/framework';
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { store } from 'lib/store';
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

export function useDecksRecord(did: string): PublicRecord<Decks | null> {
  return usePublicRecord<ModelTypes, 'decks'>('decks', did);
  // return useViewerRecord<ModelTypes, 'decks'>('decks');
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
      if (!deckDoc.content?.notes?.length || !noteUpdate) return { success: false };

      try {
        const otherNotes = deckDoc.content.notes.filter(note => note.id !== noteUpdate.id);
        const duplicateTitle = otherNotes.findIndex(note => note.title === noteUpdate.title) >= 0;

        if (duplicateTitle) {
          return { success: false, error: `There's already a note called ${noteUpdate.title}. Please use a different title.` };
        }

        await deckDoc.update({ ...deckDoc.content, notes: [...otherNotes, noteUpdate] });

        return { success: true };
      } catch (error) {
        console.error(error);
        return { success: false };
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
