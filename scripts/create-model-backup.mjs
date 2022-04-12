import { writeFile } from 'node:fs/promises';
import { CeramicClient } from '@ceramicnetwork/http-client';
import { model as profileModel } from '@datamodels/identity-profile-basic';
import { ModelManager } from '@glazed/devtools';
import { DID } from 'dids';
import { Ed25519Provider } from 'key-did-provider-ed25519';
import { getResolver } from 'key-did-resolver';
import { fromString } from 'uint8arrays';

if (!process.env.SEED) {
  throw new Error('Missing SEED environment variable');
}

const CERAMIC_URL = process.env.CERAMIC_URL || 'https://ceramic-clay.3boxlabs.com';

// The seed must be provided as an environment variable
const seed = fromString(process.env.SEED, 'base16');
// Create and authenticate the DID
const did = new DID({
  provider: new Ed25519Provider(seed),
  resolver: getResolver(),
});
await did.authenticate();

// Connect to the Ceramic node
const ceramic = new CeramicClient(CERAMIC_URL);
ceramic.did = did;

// Create a manager for the model
const manager = new ModelManager(ceramic);

// Add basicProfile to the model
manager.addJSONModel(profileModel);

const deckSchemaID = await manager.createSchema('Deck', {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Deck',
  type: 'object',
  // required: ['deck_name'],
  properties: {
    notes: {
      // TODO: JSON.stringify this whole thing for encryption?
      type: 'array',
      title: 'notes',
      items: {
        type: 'object',
        title: 'NoteItem',
        properties: {
          id: {
            type: 'string',
            maxLength: 36,
          },
          content: {
            type: 'string',
            title: 'content',
            maxLength: 10000,
          },
          title: {
            type: 'string',
            title: 'title',
            maxLength: 60,
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            title: 'created_at',
            maxLength: 30,
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            title: 'updated_at',
            maxLength: 30,
          },
        },
      },
    },
    note_tree: {
      type: 'string',
      title: 'note_tree',
      maxLength: 2000,
    },
    access_params: {
      type: 'string',
      title: 'access_params',
      maxLength: 500,
    },
  },
});
const decksSchemaID = await manager.createSchema('Decks', {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'DecksList',
  type: 'object',
  properties: {
    decks: {
      type: 'array',
      title: 'decks',
      items: {
        type: 'object',
        title: 'DeckItem',
        properties: {
          id: {
            $comment: `cip88:ref:${manager.getSchemaURL(deckSchemaID)}`,
            type: 'string',
            pattern: '^ceramic://.+(\\?version=.+)?',
            maxLength: 150,
          },
          deck_name: {
            type: 'string',
            title: 'deck_name',
            maxLength: 40,
          },
        },
      },
    },
  },
});

// Create the definition using the created schema ID
await manager.createDefinition('decks', {
  name: 'decks',
  description: 'Collection of DECKs',
  schema: manager.getSchemaURL(decksSchemaID),
});

// Write model to JSON file
await writeFile(new URL('model.json', import.meta.url), JSON.stringify(manager.toJSON()));
console.log('Encoded model written to scripts/model.json file');
