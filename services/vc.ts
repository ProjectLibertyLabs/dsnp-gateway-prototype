import type * as T from "../types/openapi.js";
import { getSchemaId } from "./announce.js";
import { AnnouncementType } from "./dsnp.js";
import { getApi } from "./frequency.js";
import { bases } from "multiformats/basics";
import { hexToString } from "@polkadot/util";
import axios from "axios";
import { Keyring } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types.js";
import { signatureVerify } from "@polkadot/util-crypto";
import * as vc from "@digitalbazaar/vc";
import { Ed25519VerificationKey2020 } from "@digitalbazaar/ed25519-verification-key-2020";
import { Ed25519Signature2020, suiteContext } from "@digitalbazaar/ed25519-signature-2020";
import { dsnp } from "@dsnp/frequency-schemas";
import jsig from "jsonld-signatures";
const { extendContextLoader } = jsig;
import avro from "avro-js";
// Use 2020-12 schema
import Ajv from "ajv/dist/2020.js";

const ajv = new Ajv();
const publicKeyAvroSchema = avro.parse(dsnp.publicKey);

// Document loader used to resolve links in credentials and schema
// TODO this should do more caching
export const documentLoader = extendContextLoader(async (url: string) => {
  // Served from the default document loader
  if (url === "https://www.w3.org/2018/credentials/v1") return vc.defaultDocumentLoader(url);

  // Served from the cryptographic suite's document loader
  if (url === "https://w3id.org/security/suites/ed25519-2020/v1") return suiteContext.documentLoader(url);

  // Well known document
  if (url.startsWith("https://ondc.org/schema/interactions/ProofOfPurchase.json"))
    return {
      document: {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          { "@vocab": "dsnp://1#" },
          "https://w3id.org/security/suites/ed25519-2020/v1",
        ],
        type: ["VerifiableCredential", "JsonSchemaCredential"],
        issuer: "dsnp://1",
        issuanceDate: "2023-10-09T03:31:37.264Z",
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
                  interactionId: { type: "string" },
                  href: { type: "string" },
                  reference: { type: "object", properties: { hello: { type: "string" } }, required: ["hello"] },
                },
                required: ["interactionId", "href", "reference"],
              },
            },
          },
          dsnp: {
            display: { label: { "en-US": "Verified Purchase" } },
            trust: { oneOf: ["dsnp://1#OndcVerifiedBuyerPlatform", "dsnp://1#OndcVerifiedSellerPlatform"] },
          },
        },
        proof: {
          type: "Ed25519Signature2020",
          created: "2023-10-09T03:31:37Z",
          verificationMethod: "dsnp://1#0",
          proofPurpose: "assertionMethod",
          proofValue: "z5bGHHXkuPtybipzWfda1EBbzGeK95VMJGg7FuoKq5JSD4akPejDxqEw9pEJwo36BaFXw8x2hrBpgotwx9e7BE9hq",
        },
      },
    };

  // DSNP URIs may be used for public keys
  if (url.startsWith("dsnp://"))
    return {
      document: {
        "@context": "https://w3id.org/security/suites/ed25519-2020/v1",
        type: "Ed25519VerificationKey2020",
      },
    };

  // Fall back to loading from the web
  const { data: document } = await axios.get(url);
  return {
    contextUrl: null,
    document,
    documentUrl: url,
  };
});

export const signedCopyOf = async (
  credential: T.Components.Schemas.VerifiableCredentialWithoutProof,
  keyPair: KeyringPair,
  issuer: string
) => {
  const signer = {
    sign: (obj: any) => {
      return keyPair.sign(obj.data);
    },
  };

  const suite = new Ed25519Signature2020({ signer });
  suite.verificationMethod = issuer;

  const signedCredential = await vc.issue({ credential, suite, documentLoader });
  return signedCredential;
};

const dsnpUserUriRegex = new RegExp("^dsnp://[1-9][0-9]*$");

export const verify = async (
  credential: T.Components.Schemas.VerifiableCredentialWithEd25519Proof
): Promise<boolean> => {
  // issuer should be a valid DSNP User URI
  if (!dsnpUserUriRegex.test(credential.issuer)) {
    console.log("issuer is not a DSNP User URI");
    return false;
  }
  // proof.verificationMethod should start with issuer User URI + "#"
  if (!credential.proof.verificationMethod.startsWith(credential.issuer + "#")) {
    console.log("proof must be from issuer");
    return false;
  }
  const dsnpUserId = Number(credential.issuer.substring("dsnp://".length));
  const keyId = Number(credential.proof.verificationMethod.substring(credential.issuer.length + 1));
  if (!(Number.isInteger(keyId) && keyId >= 0)) {
    console.log("keyId must be an unsigned integer");
    return false;
  }

  // Look up the key from stateful storage
  const api = await getApi();
  const schemaId = getSchemaId(AnnouncementType.PublicKey_AssertionMethod);
  const resp = await api.rpc.statefulStorage.getItemizedStorage(dsnpUserId, schemaId);
  const payloadAvro = resp.items[keyId].payload;
  const publicKeyMulticodec = publicKeyAvroSchema.fromBuffer(Buffer.from(payloadAvro)).publicKey;

  const verifier = {
    verify: (obj: any) => {
      // assert that prefix is [237,1]
      const { isValid } = signatureVerify(obj.data, obj.signature, publicKeyMulticodec.slice(2));
      return isValid;
    },
  };

  const suite = new Ed25519Signature2020({ verifier });

  // Perform verification of the signature (does not validate against schema)
  const output = await vc.verifyCredential({
    credential,
    suite,
    documentLoader,
    purpose: {
      validate: (proof: any) => {
        return {
          valid: proof.proofPurpose === "assertionMethod",
        };
      },
      match: (proof: any, { document, documentLoader }: any) => {
        return true;
      },
    },
  });

  if (!output.verified) {
    console.log(output);
    return false;
  }

  // Check expiration of credential
  if (credential.expirationDate) {
    const expiration = new Date(credential.expirationDate).getTime();
    if (expiration - Date.now() < 0) {
      console.log("Credential expired at " + credential.expirationDate);
      return false;
    }
  }

  // Retrieve schema
  const schemaUrl = credential.credentialSchema.id;
  // Only accept HTTPS URLs
  if (!schemaUrl.startsWith("https://")) {
    console.log("Schema URL scheme must be 'https'");
    return false;
  }
  if (schemaUrl === "https://www.w3.org/2022/credentials/v2/json-schema-credential-schema.json") {
    // Document we're verifying is a schema VC, no need to check it
    console.log("This is a schema, all good");
    return true;
  }

  const { document: schemaCredential } = await documentLoader(schemaUrl);

  // Ensure that it is a schemaCredential
  if (schemaCredential.type.indexOf("JsonSchemaCredential") == -1) {
    console.log("Schema is not a JsonSchemaCredential");
    return false;
  }

  // Check that the schema credential's schema title against the type of the VC
  if (credential.type.indexOf(schemaCredential.credentialSubject.jsonSchema.title) == -1) {
    console.log("Schema title not in " + credential.type);
    return false;
  }
  // Verify the schema credential's proof
  console.log("Verifying the schema credential");
  const schemaVerifyResult = await verify(schemaCredential);
  console.log("schemaVerifyResult = ", schemaVerifyResult);

  // Validate the credential against its schema
  const valid = ajv.validate(schemaCredential.credentialSubject.jsonSchema, credential);
  if (!valid) {
    console.log("Credential does not validate against schema");
    return false;
  }
  return true;
};
