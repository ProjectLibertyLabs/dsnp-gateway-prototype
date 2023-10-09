import type * as T from "../types/openapi.js";
import { blake2AsU8a, randomAsU8a } from "@polkadot/util-crypto";
import { base58btc } from "multiformats/bases/base58";
import type { ActivityContentNote, ActivityContentTag, ActivityContentInteraction } from "@dsnp/activity-content/types";
import { verify, documentLoader } from "./vc.js";

export const makeInteractionId = (dsnpId: string, nonceBytes: Uint8Array) => {
  return makeInteractionIdAndNonce(dsnpId, nonceBytes).interactionId;
};

export const makeInteractionIdAndNonce = (dsnpId: string, nonceBytes: Uint8Array = randomAsU8a(24)) => {
  // FIXME make this a bitwise uint64 encoding rather than a text encoding
  const dsnpIdBytes = new TextEncoder().encode(dsnpId);

  const interactionHash = blake2AsU8a(new Uint8Array([...dsnpIdBytes, ...nonceBytes]));

  // [160,228,2] = blake2-256 multicodec value
  return {
    interactionId: base58btc.encode(new Uint8Array([160, 228, 2, ...interactionHash])),
    nonce: base58btc.encode(nonceBytes),
  };
};

export const verifyInteractionId = (interactionId: string, dsnpId: string, nonceMultibase: string) => {
  const nonce = base58btc.decode(nonceMultibase);
  const checkInteractionId = makeInteractionId(dsnpId, nonce);
  return checkInteractionId === interactionId;
};

function isInteraction(tag: ActivityContentTag): tag is ActivityContentInteraction {
  return (tag as any).type?.toLowerCase() === "interaction";
}

export const verifiedInteractionsFromContent = async (content: string, fromId: string) => {
  const note: ActivityContentNote = JSON.parse(content);
  const tags: ActivityContentTag[] = (note.tag as ActivityContentTag[]) || [];

  const results = [];

  console.log("Start verifiedInteractionsFromContent, content = " + content);
  for (const tag of tags) {
    if (isInteraction(tag)) {
      console.log("--- it's an interaction, fromId: " + fromId + " ---");
      if (verifyInteractionId(tag.ticket?.credentialSubject?.interactionId || "", fromId, tag.nonce)) {
        if (tag.ticket) {
          // TODO try/catch
          try {
            console.log("--- found ticket ---");
            const verified = await verify(tag.ticket as T.Components.Schemas.VerifiableCredentialWithEd25519Proof);
            console.log("--- verified? ", verified);
            if (verified) {
              if (tag.ticket.credentialSchema) {
                console.log("looking for schema " + tag.ticket.credentialSchema.id);
                const { document: schema } = await documentLoader(tag.ticket.credentialSchema.id);
                console.log("got schema ", JSON.stringify(schema, null, 2));
                console.log("got schema.credentialSubject " + JSON.stringify(schema.credentialSubject));
                const display = schema.credentialSubject.dsnp.display;
                results.push({
                  href: tag.href,
                  label: schema.credentialSubject.dsnp.display.label as { [name: string]: string },
                });
              }
            }
          } catch (e) {
            console.log(e);
          }
        }
      }
    }
  }

  console.log("results = ", results);

  return results;
};
