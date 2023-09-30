const { options } = require("@frequency-chain/api-augment");
const { WsProvider, ApiPromise, Keyring } = require("@polkadot/api");
const { deploy } = require("@dsnp/frequency-schemas/cli/deploy");
const { u8aWrapBytes } = require("@polkadot/util");
const avro = require("avro-js");
const { dsnp } = require("@dsnp/frequency-schemas");

// Given a list of events, a section and a method,
// returns the first event with matching section and method.
const eventWithSectionAndMethod = (events, section, method) => {
  const evt = events.find(({ event }) => event.section === section && event.method === method);
  return evt?.event;
};


const main = async () => {
  console.log("A quick script that will setup a clean localhost instance of Frequency for DSNP ");

  const providerUri = "ws://127.0.0.1:9944";
  const provider = new WsProvider(providerUri);
  const api = await ApiPromise.create({ provider, throwOnConnect: true, ...options });
  const keys = new Keyring().addFromUri("//Alice", {}, "sr25519");

  // Create alice msa
  const aliceMsa = await new Promise((resolve, reject) => {
    console.log("Creating an MSA...");
    api.tx.msa.create()
      .signAndSend(keys, {}, ({ status, events, dispatchError }) => {
        if (dispatchError) {
          console.error("ERROR: ", dispatchError.toHuman());
          reject();
        } else if (status.isInBlock || status.isFinalized) {
          const evt = eventWithSectionAndMethod(events, "msa", "MsaCreated");
          if (evt) {
            resolve (evt?.data[0]);
          } else {
            console.error("ERROR: Expected event not found", events.map(x => x.toHuman()));
            reject();
          }
        }
      });
  });
  console.log("SUCCESS: MSA Created:" + aliceMsa);

  // Create alice provider
  await new Promise((resolve, reject) => {
    console.log("Creating a Provider...");
    api.tx.msa.createProvider("alice")
      .signAndSend(keys, {}, ({ status, events, dispatchError }) => {
        if (dispatchError) {
          console.error("ERROR: ", dispatchError.toHuman());
          reject();
        } else if (status.isInBlock || status.isFinalized) {
          const evt = eventWithSectionAndMethod(events, "msa", "ProviderCreated");
          if (evt) {
            const id = evt?.data[0];
            console.log("SUCCESS: Provider Created:" + id);
            resolve();
          } else {
            console.error("ERROR: Expected event not found", events.map(x => x.toHuman()));
            reject();
          }
        }
      });
  });

  // Alice provider get Capacity
  await new Promise((resolve, reject) => {
    console.log("Staking for Capacity...");
    api.tx.capacity.stake("1", 500_000 * Math.pow(8, 10))
      .signAndSend(keys, {}, ({ status, events, dispatchError }) => {
        if (dispatchError) {
          console.error("ERROR: ", dispatchError.toHuman());
          reject();
        } else if (status.isInBlock || status.isFinalized) {
          const evt = eventWithSectionAndMethod(events, "capacity", "Staked");
          if (evt) {
            console.log("SUCCESS: Provider Staked:", evt.data.toHuman());
            resolve();
          } else {
            console.error("ERROR: Expected event not found", events.map(x => x.toHuman()));
            reject();
          }
        }
      });
  });

  // Deploy Schemas
  const schemaInfo = await deploy();


  // Announce a public key for Alice
  const assertionMethodSchemaId = schemaInfo.filter((obj) => {
    return obj.schemaName == "publicKey_assertionMethod";
  })[0].id;

  const signingKeys = new Keyring({ type: "ed25519" })
    .addFromUri("//Alice//assertionMethod", {}, "ed25519");

  const blockNum = Number((await api.query.system.number()).toJSON());
  const publicKeyAvroSchema = avro.parse(dsnp.publicKey);
  // 0xed from https://github.com/multiformats/multicodec/blob/master/table.csv
  // varint(11101101) = (1 1101101) (0 0000001)
  const ed25519pubPrefix = new Uint8Array([237, 1]); // 0xed in varint notation
  const publicKeyMulticodec = Buffer.from(
    new Uint8Array([ ...ed25519pubPrefix, ...signingKeys.publicKey ])
  );

  const keyPayloadRaw = {
    schemaId: assertionMethodSchemaId,
    expiration: blockNum + 50,
    actions: [
      {
        Add: {
          data: publicKeyAvroSchema.toBuffer({ publicKey: publicKeyMulticodec })
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

  console.log("Setup Complete!");
}

main().catch(console.error).finally(process.exit);
