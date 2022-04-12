import { writeFile } from 'node:fs/promises';
import { CeramicClient } from '@ceramicnetwork/http-client';
import { model as profileModel } from '@datamodels/identity-profile-basic';
import { model as accountsModel } from '@datamodels/identity-accounts-crypto';
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

// Add basicProfile and cryptoAccounts to the model
manager.addJSONModel(profileModel);
manager.addJSONModel(accountsModel);

const deckSchemaID = await manager.createSchema('Deck', {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Deck',
  type: 'object',
  properties: {
    encryptedZip: {
      type: 'string',
      title: 'encryptedZip',
      contentEncoding: 'base64',
    },
    symmetricKey: {
      type: 'string',
      title: 'symmetricKey',
      contentEncoding: 'base64',
    },
    accessControlConditions: {
      type: 'array',
      title: 'accessControlConditions',
      items: {
        type: 'object',
        title: 'AccessControlConditionItem',
      },
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
