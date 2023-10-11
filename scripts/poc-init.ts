/*
Experimental script. Currently generates (but does not persist) a signed schema,
and verifies a credential against the schema credential.

Run with:
 npm run build && node ./dist/scripts/poc-init.js
*/

import "dotenv/config.js";
import type * as T from "../types/openapi.js";
import { Keyring } from "@polkadot/api";
import jsig from "jsonld-signatures";
const { extendContextLoader } = jsig;
import { signedCopyOf, verify } from "../services/vc.js";

export const newVerifiableCredential = async () => {
  try {
    const unsignedVC: T.Components.Schemas.VerifiableCredentialWithoutProof = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        {
          "@vocab": "dsnp://" + process.env.PROVIDER_ID + "#",
        },
      ],
      type: ["VerifiableCredential", "JsonSchemaCredential"],
      issuer: "dsnp://" + process.env.PROVIDER_ID,
      issuanceDate: new Date().toISOString(),
      expirationDate: "2099-01-01T00:00:00.000Z",
      credentialSchema: {
        id: "https://www.w3.org/2022/credentials/v2/json-schema-credential-schema.json",
        type: "JsonSchema",
        digestSRI: "sha384-S57yQDg1MTzF56Oi9DbSQ14u7jBy0RDdx0YbeV7shwhCS88G8SCXeFq82PafhCrW",
      },
      credentialSubject: {
        type: "JsonSchema",

        jsonSchema: {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          title: "OndcProofOfPurchase",
          type: "object",
          properties: {
            credentialSubject: {
              type: "object",
              properties: {
                interactionId: {
                  type: "string",
                },
                href: {
                  type: "string",
                },
                reference: {
                  type: "object",
                  properties: {
                  },
                },
              },
              required: ["interactionId", "href", "reference"],
            },
          },
        },

        dsnp: {
          display: {
            label: {
              "en-US": "Verified Purchase",
            },
          },
          trust: {
            oneOf: ["dsnp://" + process.env.PROVIDER_ID + "#OndcVerifiedBuyerPlatform", "dsnp://" + process.env.PROVIDER_ID + "#OndcVerifiedSellerPlatform"],
          },
        },
      },
    };

    const signingKeys = new Keyring({ type: "ed25519" }).addFromUri(
      String(process.env.PROVIDER_CREDENTIAL_SIGNING_KEY_URI),
      {},
      "ed25519"
    );

    const signedVC = await signedCopyOf(
      unsignedVC,
      signingKeys,
      "dsnp://" + process.env.PROVIDER_ID + "#" + process.env.PROVIDER_CREDENTIAL_SIGNING_KEY_ID
    );

    return signedVC;
  } catch (e) {
    console.error(e);
    throw e;
  }
};

const newVC = await newVerifiableCredential();
console.log(JSON.stringify(newVC));
const verifyResult = await verify(newVC);
console.log("verifyResult: ", verifyResult);

// Test interaction credential
const interactionVC: T.Components.Schemas.VerifiableCredentialWithEd25519Proof = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    { "@vocab": "dsnp://" + process.env.PROVIDER_ID + "#" },
    "https://w3id.org/security/suites/ed25519-2020/v1",
  ],
  type: ["OndcProofOfPurchase", "VerifiableCredential"],
  issuer: "dsnp://" + process.env.PROVIDER_ID,
  issuanceDate: "2023-10-08T21:14:01.230Z",
  credentialSchema: {
    type: "VerifiableCredentialSchema2023",
    id: "https://ondc.org/schema/interactions/" + process.env.FREQUENCY_NETWORK + "/ProofOfPurchase.json",
  },
  credentialSubject: {
    interactionId: "zH47VxQmaLFN2Kk7KowLvQYhHooqbyYLw7WuyfxBNC75x7Dqr",
    href: "https://www.etsy.com/listing/1292521772/melting-clock-salvador-dali-the",
    reference: { hello: "world" },
  },
  proof: {
    type: "Ed25519Signature2020",
    created: "2023-10-08T21:14:01Z",
    verificationMethod: "dsnp://1#0",
    proofPurpose: "assertionMethod",
    proofValue: "z3W6RLJVMa72h61XvwjSd4Xed8jYFCwfaWunPVcSC8DBBpVRJnDgemYiwBkFUAezJWPnLXpVjmL2S2RmyPrt1QTjZ",
  },
};

const verifyResult2 = await verify(interactionVC);
console.log("verifyResult2: ", verifyResult2);

process.exit();
