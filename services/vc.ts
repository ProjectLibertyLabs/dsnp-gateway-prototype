import type * as T from "../types/openapi.js";
import { getSchemaId } from "./announce.js";
import { AnnouncementType } from "./dsnp.js";
import { getApi } from "./frequency.js";
import { bases } from "multiformats/basics";
import { hexToString } from "@polkadot/util";
import axios from "axios";
import { Keyring } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types.js"
import { signatureVerify } from "@polkadot/util-crypto";
import * as vc from '@digitalbazaar/vc';
import { Ed25519VerificationKey2020 } from "@digitalbazaar/ed25519-verification-key-2020";
import { Ed25519Signature2020, suiteContext } from "@digitalbazaar/ed25519-signature-2020";
import { dsnp } from "@dsnp/frequency-schemas";
import jsig from "jsonld-signatures";
const { extendContextLoader } = jsig;
import avro from "avro-js";

const publicKeyAvroSchema = avro.parse(dsnp.publicKey);

// Document loader used to resolve links in credentials and schema
// TODO this should do more caching
const documentLoader = extendContextLoader(async (url: string) => {
  // Served from the default document loader
  if (url === "https://www.w3.org/2018/credentials/v1") return vc.defaultDocumentLoader(url);

  // Served from the cryptographic suite's document loader
  if (url === "https://w3id.org/security/suites/ed25519-2020/v1") return suiteContext.documentLoader(url);

  // DSNP URIs may be used for public keys
  if (url.startsWith("dsnp://")) return {
    document: {
      "@context": "https://w3id.org/security/suites/ed25519-2020/v1",
      type: "Ed25519VerificationKey2020",
    }
  };
    
  // Fall back to loading from the web
  const {data: document} = await axios.get(url);
  return {
    contextUrl: null,
    document,
    documentUrl: url,
  };
});

export const signedCopyOf = async (credential: T.Components.Schemas.VerifiableCredentialWithoutProof, keyPair: KeyringPair, issuer: string) => {

  const signer = {
    sign: (obj: any) => {
      return keyPair.sign(obj.data);
    }
  };

  const suite = new Ed25519Signature2020({signer});
  suite.verificationMethod = issuer;

  const signedCredential = await vc.issue({ credential, suite, documentLoader });
  // verify it (just for testing)
  const verified = await verify(signedCredential);
  console.log("verified? ", verified);
  return signedCredential;
}

const dsnpUserUriRegex = new RegExp("^dsnp://[1-9][0-9]*$");

export const verify = async (credential: T.Components.Schemas.VerifiableCredentialWithEd25519Proof) => {
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
  console.log("items.length: ", resp.items.length);
  const payloadAvro = resp.items[keyId].payload;
  const publicKeyMulticodec = publicKeyAvroSchema.fromBuffer(Buffer.from(payloadAvro)).publicKey;
  console.log(publicKeyMulticodec);

  const verifier = {
    verify: (obj: any) => {
      // assert that prefix is [237,1]
      const { isValid } = signatureVerify(obj.data, obj.signature, publicKeyMulticodec.slice(2));
      return isValid;
    }
  }; 

  const suite = new Ed25519Signature2020({verifier});

  // Perform verification
  const output = await vc.verifyCredential(
    {
      credential,
      suite,
      documentLoader,
      purpose: {
        validate: (proof: any) => {
          return {
            valid: proof.proofPurpose === "assertionMethod"
          };
        },
        match: (proof: any, {document, documentLoader}: any) => {
          return true;
        }
      }
    }
  );
  return output.verified;
}
