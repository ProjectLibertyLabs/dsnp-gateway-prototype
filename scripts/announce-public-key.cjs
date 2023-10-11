const { options } = require("@frequency-chain/api-augment");
const { WsProvider, ApiPromise, Keyring } = require("@polkadot/api");
const { deploy } = require("@dsnp/frequency-schemas/cli/deploy");
const { u8aWrapBytes } = require("@polkadot/util");
const avro = require("avro-js");
const { dsnp } = require("@dsnp/frequency-schemas");
const { mnemonicGenerate, ed25519PairFromSeed } = require("@polkadot/util-crypto");

// Given a list of events, a section and a method,
// returns the first event with matching section and method.
const eventWithSectionAndMethod = (events, section, method) => {
  const evt = events.find(({ event }) => event.section === section && event.method === method);
  return evt?.event;
};

const main = async () => {
  console.log("A quick script that will announce an assertionMethod public key for an account with an MSA");
  if (!process.env.FREQUENCY_ENDPOINT_URL || !process.env.ACCOUNT_URI) {
  console.log("Please specify FREQUENCY_ENDPOINT_URL and ACCOUNT_URI environment variables.");
  process.exit(1);
  }

  const providerUri = process.env.FREQUENCY_ENDPOINT_URL;
  const provider = new WsProvider(providerUri);
  const api = await ApiPromise.create({ provider, throwOnConnect: true, ...options });
  const keys = new Keyring().addFromUri(process.env.ACCOUNT_URI, {}, "sr25519");

  // Announce a public key for fide.org
  const assertionMethodSchemaId = 100; // FIXME that's only Rococo
  /*
  schemaInfo.filter((obj) => {
    return obj.schemaName == "publicKey_assertionMethod";
  })[0].id;
  */

  const mnemonic = mnemonicGenerate();
  console.log(`Generated mnemonic: ${mnemonic}`);
  const signingKeys = new Keyring({ type: "ed25519" })
    .addFromUri(mnemonic, {}, "ed25519");

  const blockNum = Number((await api.query.system.number()).toJSON());
  const publicKeyAvroSchema = avro.parse(dsnp.publicKey);
  // 0xed from https://github.com/multiformats/multicodec/blob/master/table.csv
  // varint(11101101) = (1 1101101) (0 0000001)
  const ed25519pubPrefix = new Uint8Array([237, 1]); // 0xed in varint notation
  const publicKeyMulticodec = Buffer.from(
    new Uint8Array([ ...ed25519pubPrefix, ...signingKeys.publicKey ])
  );
  const avroBuffer = publicKeyAvroSchema.toBuffer({ publicKey: publicKeyMulticodec });
  
  const bufferWithHeader = Buffer.concat([Buffer.from([ avroBuffer.length << 2 ]), avroBuffer]);
  
  const keyPayloadRaw = {
    schemaId: assertionMethodSchemaId,
    expiration: blockNum + 50,
    actions: [
      {
        Add: {
          data: bufferWithHeader
        }
      }
    ]
  };
  const keyPayload = api.registry.createType(
    "PalletStatefulStorageItemizedSignaturePayloadV2",
    keyPayloadRaw
  );
  const keyPayloadSignatureBytes = keys.sign(u8aWrapBytes(keyPayload.toU8a()));
  const keyPayloadSignature = api.registry.createType(
    "SpRuntimeMultiSignature",
    { Sr25519: keyPayloadSignatureBytes }
  );

  await new Promise((resolve, reject) => {
    console.log("Announcing assertionMethod public key...");
    api.tx.statefulStorage.applyItemActionsWithSignatureV2(
      keys.publicKey,
      keyPayloadSignature,
      keyPayload
    ).signAndSend(keys, {}, ({ status, events, dispatchError }) => {
        if (dispatchError) {
          console.error("ERROR: ", dispatchError.toHuman());
          reject();
        } else if (status.isInBlock || status.isFinalized) {
          const evt = eventWithSectionAndMethod(events, "statefulStorage", "ItemizedPageUpdated");
          if (evt) {
            console.log("SUCCESS: Public key added:", evt.data.toHuman());
            resolve();
          } else {
            console.error("ERROR: Expected event not found", events.map(x => x.toHuman()));
            reject();
          }
        }
      });
  });

  console.log("Public Key Announcement Complete!");
}

main().catch(console.error).finally(process.exit);
