import { Handler } from "openapi-backend";
import type * as T from "../types/openapi.js";
import { Keyring } from "@polkadot/api";
import { signedCopyOf } from "../services/vc.js";
import { getEntitlementChecker } from "../services/entitlement-checker.js";
import { base58btc } from "multiformats/bases/base58";

const signingKeys = new Keyring({ type: "ed25519" }).addFromUri(
  String(process.env.PROVIDER_CREDENTIAL_SIGNING_KEY_URI),
  {},
  "ed25519"
);

export const submitInteraction: Handler<T.Paths.SubmitInteraction.RequestBody> = async (c, req, res) => {
  console.log(c.request.body);
  const attributeSetType = c.request.body.attributeSetType;
  const checker = getEntitlementChecker(attributeSetType);
  if (!checker) {
    // No entitlement checker for attributeSetType
    return res.status(404).send();
  }
  const entitlement = await checker(c);
  if (!entitlement) {
    // Failed entitlement check
    return res.status(401).send();
  }
  const ticketType = attributeSetType.substring(attributeSetType.indexOf("#") + 1);
  try {
    const unsignedTicket: T.Components.Schemas.VerifiableCredentialWithoutProof = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        {
          "@vocab": "dsnp://" + process.env.PROVIDER_ID + "#",
        },
      ],
      type: [ticketType, "VerifiableCredential"],
      issuer: "dsnp://" + process.env.PROVIDER_ID,
      issuanceDate: new Date().toISOString(),
      credentialSchema: {
        type: "VerifiableCredentialSchema2023",
        id: entitlement.schemaUrl,
      },
      credentialSubject: {
        interactionId: c.request.body.interactionId,
        href: entitlement.href,
        reference: c.request.body.reference,
      },
    };

    const signedTicket = await signedCopyOf(
      unsignedTicket,
      signingKeys,
      `did:dsnp:${process.env.PROVIDER_ID}#${base58btc.encode(signingKeys.publicKey)}`
    );

    console.log(signedTicket);

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
