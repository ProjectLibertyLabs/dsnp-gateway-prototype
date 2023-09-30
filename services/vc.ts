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
import jsig from "jsonld-signatures";
const { extendContextLoader } = jsig;

// Document loader used to resolve links in credentials and schema
const documentLoader = extendContextLoader(async (url: string) => {
    if (url !== 'https://www.w3.org/2018/credentials/v1' &&
       url !== 'https://w3id.org/security/suites/ed25519-2020/v1' ) {
        const {data: document} = await axios.get(url);
        return {
            contextUrl: null,
            document,
            documentUrl: url,
        };
    }

    if (url === 'https://w3id.org/security/suites/ed25519-2020/v1')
        return suiteContext.documentLoader(url);
    return vc.defaultDocumentLoader(url);
});

// FIXME this should take a VerifiableCredential type, not a ticket
export const signedCopyOf = async (credential: T.Components.Schemas.InteractionTicket, keyPair: KeyringPair, issuer: string) => {

  const signer = {
    sign: (obj: any) => {
      console.log("Sign got obj: ", obj);
      return keyPair.sign(obj.data);
    }
  };

  const verifier = {
    verify: (obj: any) => {
      console.log("Verify got obj: ", obj);
      //const { isValid } = signatureVerify(document, signature, keyPair.publicKey);
      //return isValid;
      return true;
   }
  }; 

  const suite = new Ed25519Signature2020({signer, verifier});
  suite.verificationMethod = issuer;

  return await vc.issue({ credential, suite, documentLoader });
}

const dsnpUserUriRegex = new RegExp("^dsnp://[1-9][0-9]*$");

export const verifyFromDsnpIssuer = async (credential: T.Components.Schemas.InteractionTicket) => {
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
  const keyId = Number(credential.proof.verificationMethod.substring(credential.issuer.length() + 1));
  if (!(Number.isInteger(keyId) && keyId >= 0)) {
    console.log("keyId must be an unsigned integer");
    return false;
  }

  // Look up the key from stateful storage
  // TODO
  return true;
}