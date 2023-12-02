import type * as T from "../types/openapi.js";
import { getSchemaId } from "./announce.js";
import { AnnouncementType } from "./dsnp.js";
import { getApi } from "./frequency.js";
import { hexToString } from "@polkadot/util";
import axios from "axios";
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

type SchemaCacheType = {
  [schemaUrl: string]: object;
};

const schemaCache: SchemaCacheType = {};

export const registerCredentialSchema = (schemaUrl: string, documentLoaderOutput: object) => {
  if (schemaCache[schemaUrl]) {
    throw new Error(`A document is already registered for credential schema URL '${schemaUrl}'`);
  }
  schemaCache[schemaUrl] = documentLoaderOutput;
};

// Document loader used to resolve links in credentials and schema
// TODO currently never expires anything from cache, this should be tuneable
// TODO check if default document loader does caching
export const documentLoader = extendContextLoader(async (url: string) => {
  // Served from the default document loader
  if (url === "https://www.w3.org/2018/credentials/v1") return vc.defaultDocumentLoader(url);

  // Served from the cryptographic suite's document loader
  if (url === "https://w3id.org/security/suites/ed25519-2020/v1") return suiteContext.documentLoader(url);

  const cached = schemaCache[url];
  if (cached) {
    return cached;
  }

  // DID URIs may hit this when used for public keys
  // TODO This was the result of trial and error -- may not be the best way
  if (url.startsWith("did:")) {
    return {
      document: {
        "@context": "https://w3id.org/security/suites/ed25519-2020/v1",
        type: "Ed25519VerificationKey2020",
      },
    };
  }

  // Fall back to loading from the web
  const { data: document } = await axios.get(url);
  const output = {
    contextUrl: null, // TODO not sure what this is
    document,
    documentUrl: url,
  };
  schemaCache[url] = output;
  return output;
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
