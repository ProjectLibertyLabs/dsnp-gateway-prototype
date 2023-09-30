import { Context, Handler } from "openapi-backend";
import type * as T from "../types/openapi.js";
import { Keyring } from "@polkadot/api";
import { signedCopyOf } from "../services/vc.js"
import type { KeyringPair } from "@polkadot/keyring/types.js"

type VerifierOutput = {
  verified: boolean,
  ticketType: string,
  schemaUrl: string,
  href: string,
};

type Verifier = (c: Context) => VerifierOutput;

const verifiers: any = {
  "xxx": (c: Context) => {
    return {
      verified: true,
      ticketType: "ProductLink",
      schemaUrl: "https://ondc.org/schema/interactions/ProductLinkV1",
      href: "https://ondc.org/product/123"
    };
  }
};

// Note: The public key for this is added to the chain in scripts/local-init.cjs
const signingKeys = new Keyring({ type: "ed25519" })
  .addFromUri(process.env.PROVIDER_KEY_URI + "//assertionMethod");

export const submitInteraction: Handler<T.Paths.SubmitInteraction.RequestBody> = async (c, req, res) => {
  const verifier = verifiers[c.request.body.attributeSetType];
  if (!verifier) {
    // No verifier for attributeSetType
    return res.status(404).send();
  }
  const verifyOutput = verifier(c);
  if (!verifyOutput.verified) {
    // Failed verification
    return res.status(401).send();
  }
  try {
    // Insert logic to validate c.request.body.reference here

    // TODO: First create the (unsigned) credential, then sign it
    const unsignedTicket : T.Components.Schemas.InteractionTicket = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        {
          "@vocab": "dsnp://" + process.env.PROVIDER_ID + "#",
        },
      ],
      "type": ["ProductLink", "VerifiableCredential"],
      "issuer": "dsnp://" + process.env.PROVIDER_ID,
      "issuanceDate": new Date().toISOString(),
      "credentialSchema": {
        "type": "VerifiableCredentialSchema2023",
        "id": verifyOutput.schemaUrl,
      },
      "credentialSubject": {
        "interactionId": c.request.body.interactionId,
        "href": "https://mystore.com/item/123", // FIXME
        "reference": c.request.body.reference,
      }
    };

    const signingKeys = new Keyring({ type: "ed25519" })
      .addFromUri("//Alice//assertionMethod", {}, "ed25519");

    const signedTicket = await signedCopyOf(
      unsignedTicket,
      signingKeys,
      "dsnp://" + process.env.PROVIDER_ID + "#1" // FIXME need correct index?
    );

    const response: T.Paths.SubmitInteraction.Responses.$200 = {
      "attributeSetType": c.request.body.attributeSetType,
      ticket: signedTicket,
    };
    return res.status(200).json(response);
  } catch (e) {
    console.error(e);
    return res.status(500).send();
  }
};
