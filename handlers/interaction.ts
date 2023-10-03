import { Context, Handler } from "openapi-backend";
import type * as T from "../types/openapi.js";
import { Keyring } from "@polkadot/api";
import { signedCopyOf } from "../services/vc.js";
import type { KeyringPair } from "@polkadot/keyring/types.js";

export type CheckerOutput = {
  entitled: boolean;
  ticketType: string;
  schemaUrl: string;
  href: string;
};

type EntitlementChecker = (c: Context) => CheckerOutput;

const checkers: any = {
  "dsnp://1#OndcProofOfPurchase": (c: Context) => {
    // Insert logic to validate c.request.body.reference here
    const reference = c.request.body.reference;

    // Example only!
    if (reference.hello !== "world") {
      return { entitled: false };
    }

    return {
      entitled: true,
      ticketType: "ProofOfPurchase",
      schemaUrl: "https://ondc.org/schema/interactions/ProofOfPurchase.json",
      href: "https://ondc.org/product/123",
    };
  },
};

// Note: The public key for this is added to the chain in scripts/local-init.cjs
const signingKeys = new Keyring({ type: "ed25519" }).addFromUri(process.env.PROVIDER_KEY_URI + "//assertionMethod");

export const submitInteraction: Handler<T.Paths.SubmitInteraction.RequestBody> = async (c, req, res) => {
console.log(c.request.body);
  const checker = checkers[c.request.body.attributeSetType];
  if (!checker) {
    // No entitlement checker for attributeSetType
    return res.status(404).send();
  }
  const checkerOutput = checker(c);
  if (!checkerOutput.entitled) {
    // Failed entitlement check
    return res.status(401).send();
  }
  try {
    const unsignedTicket: T.Components.Schemas.InteractionTicket = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        {
          "@vocab": "dsnp://" + process.env.PROVIDER_ID + "#",
        },
      ],
      type: [checkerOutput.ticketType, "VerifiableCredential"],
      issuer: "dsnp://" + process.env.PROVIDER_ID,
      issuanceDate: new Date().toISOString(),
      credentialSchema: {
        type: "VerifiableCredentialSchema2023",
        id: checkerOutput.schemaUrl,
      },
      credentialSubject: {
        interactionId: c.request.body.interactionId,
        href: checkerOutput.href,
        reference: c.request.body.reference,
      },
    };

    const signingKeys = new Keyring({ type: "ed25519" }).addFromUri(
      String(process.env.PROVIDER_CREDENTIAL_SIGNING_KEY_URI),
      {},
      "ed25519"
    );

    const signedTicket = await signedCopyOf(
      unsignedTicket,
      signingKeys,
      "dsnp://" + process.env.PROVIDER_ID + "#" + process.env.PROVIDER_CREDENTIAL_SIGNING_KEY_ID
    );

    const response: T.Paths.SubmitInteraction.Responses.$200 = {
      attributeSetType: c.request.body.attributeSetType,
      ticket: signedTicket,
    };
    return res.status(200).json(response);
  } catch (e) {
    console.error(e);
    return res.status(500).send();
  }
};
