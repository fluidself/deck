import type { StreamMetadata } from '@ceramicnetwork/common';
import type { TileDocument } from '@ceramicnetwork/stream-tile';
import { PublicID, useConnection, useCore, useViewerID, usePublicRecord, useViewerRecord } from '@self.id/framework';
// import type { PublicRecord } from '@self.id/framework';
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import type { ModelTypes, Deck, NoteItem } from 'types/ceramic';
import { AccessControlCondition, BooleanCondition } from 'types/lit';
import { decryptDeck, encryptWithLit } from 'utils/encryption';
import { useCurrentWorkspace } from 'utils/useCurrentWorkspace';

type TileDoc<ContentType> = {
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

function useTileDoc<ContentType>(id: string): TileDoc<ContentType> {
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

// export function useDecksRecord(did: string): PublicRecord<Decks | null> {
//   // return usePublicRecord<ModelTypes, 'decks'>('decks', did);
//   return useViewerRecord<ModelTypes, 'decks'>('decks');
// }

export default function useDeck(id: string) {
  const [connection, connect] = useConnection<ModelTypes>();
  const deckDoc = useTileDoc<Deck>(id);
  const { workspace } = useCurrentWorkspace();

  const content = deckDoc.content;
  const isEditable = deckDoc.isController;

  // TODO: handle errors / loading state?

  const addNote = useCallback(
    async newNote => {
      if (connection.status !== 'connected') await connect();
      if (!deckDoc.content || !newNote) return false;

      try {
        const { notes, accessControlConditions } = await decryptDeck(deckDoc.content);
        if (!notes || !accessControlConditions) {
          return false;
        }

        const toEncrypt = JSON.stringify({ notes: [...notes, newNote] });
        const [encryptedZipBase64, encryptedSymmetricKeyBase64] = await encryptWithLit(toEncrypt, accessControlConditions);

        await deckDoc.update({
          encryptedZip: encryptedZipBase64,
          symmetricKey: encryptedSymmetricKeyBase64,
          accessControlConditions,
        });

        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
    [deckDoc, connection, connect],
  );

  const updateNotes = useCallback(
    async (noteUpdates, noteToDelete = null) => {
      if (connection.status !== 'connected') await connect();
      if (!deckDoc.content || !workspace) return false;

      try {
        const { notes, accessControlConditions } = await decryptDeck(deckDoc.content);
        if (!notes || !accessControlConditions) {
          return false;
        }

        const noteUpdateIds = noteUpdates.map((note: NoteItem) => note.id);
        let otherNotes = noteToDelete ? notes.filter(note => note.id !== noteToDelete) : notes;
        otherNotes = otherNotes.filter(note => !noteUpdateIds.includes(note.id));
        // .filter((value, index, self) => index === self.findIndex(t => t.id === value.id));
        // TODO: look into this?

        console.log(`saving ${[...otherNotes, ...noteUpdates].length} notes`);
        console.log([...otherNotes, ...noteUpdates]);
        const toEncrypt = JSON.stringify({ notes: [...otherNotes, ...noteUpdates] });
        const [encryptedZipBase64, encryptedSymmetricKeyBase64] = await encryptWithLit(toEncrypt, accessControlConditions);

        await deckDoc.update({
          encryptedZip: encryptedZipBase64,
          symmetricKey: encryptedSymmetricKeyBase64,
          accessControlConditions,
        });

        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
    [deckDoc, workspace, connection, connect],
  );

  const updateAccessControlConditions = useCallback(
    async (accessControlConditions: (AccessControlCondition | BooleanCondition)[]) => {
      if (connection.status !== 'connected') await connect();
      if (!deckDoc.content) return false;

      try {
        const { notes } = await decryptDeck(deckDoc.content);
        if (!notes) {
          return false;
        }

        const toEncrypt = JSON.stringify({ notes });
        const [encryptedZipBase64, encryptedSymmetricKeyBase64] = await encryptWithLit(toEncrypt, accessControlConditions);

        await deckDoc.update({
          encryptedZip: encryptedZipBase64,
          symmetricKey: encryptedSymmetricKeyBase64,
          accessControlConditions,
        });

        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
    [deckDoc, connection, connect],
  );

  return {
    isEditable,
    isError: deckDoc.isError,
    isLoading: deckDoc.isLoading,
    isMutable: deckDoc.isMutable,
    isMutating: deckDoc.isMutating,
    content,
    error: deckDoc.error,
    addNote,
    updateNotes,
    updateAccessControlConditions,
  };
}
