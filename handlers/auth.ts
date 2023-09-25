import { Handler } from "openapi-backend";
import type * as T from "../types/openapi.js";
import {
  getApi,
  getCurrentBlockNumber,
  getNetwork,
  getNonce,
  getProviderHttp,
  getProviderKey,
} from "../services/frequency.js";
import { generateChallenge, createAuthToken, getMsaByPublicKey, useChallenge } from "../services/auth.js";
import { AnnouncementType } from "../services/dsnp.js";
import { getSchemaId } from "../services/announce.js";
import { getIpfsGateway } from "../services/ipfs.js";
import { signatureVerify } from "@polkadot/util-crypto";
import { hexToU8a, numberToU8a } from "@polkadot/util";

// Environment Variables
const providerId = process.env.PROVIDER_ID;
if (!providerId) {
  throw new Error("PROVIDER_ID env variable is required");
}

// Constants
const addProviderSchemas = [
  getSchemaId(AnnouncementType.Broadcast),
  getSchemaId(AnnouncementType.Reaction),
  getSchemaId(AnnouncementType.Reply),
  getSchemaId(AnnouncementType.Tombstone),
  getSchemaId(AnnouncementType.Profile),
  getSchemaId(AnnouncementType.Update),
  getSchemaId(AnnouncementType.PublicFollows),
];
// Make sure they are sorted.
addProviderSchemas.sort();

export const authChallenge: Handler<{}> = async (_c, _req, res) => {
  const response: T.Paths.AuthChallenge.Responses.$200 = { challenge: generateChallenge() };
  return res.status(200).json(response);
};

export const authLogin: Handler<T.Paths.AuthLogin.RequestBody> = async (c, _req, res) => {
  const { publicKey, encodedValue, challenge } = c.request.requestBody;
  const msaId = await getMsaByPublicKey(publicKey);
  if (!msaId || !useChallenge(challenge)) return res.status(401).send();
  // Validate Challenge signature
  const { isValid } = signatureVerify(challenge, encodedValue, publicKey);
  if (!isValid) return res.status(401).send();

  const response: T.Paths.AuthLogin.Responses.$200 = {
    accessToken: await createAuthToken(c.request.requestBody.publicKey),
    expires: Date.now() + 60 * 60 * 24,
    dsnpId: msaId,
  };
  return res.status(200).json(response);
};

export const authLogout: Handler<{}> = async (_c, _req, res) => {
  return res.status(201);
};

export const authProvider: Handler<{}> = async (_c, _req, res) => {
  const response: T.Paths.AuthProvider.Responses.$200 = {
    nodeUrl: getProviderHttp(),
    ipfsGateway: getIpfsGateway(),
    providerId,
    schemas: addProviderSchemas,
    network: getNetwork(),
  };
  return res.status(200).json(response);
};

export const authCreate: Handler<T.Paths.AuthCreate.RequestBody> = async (c, _req, res) => {
  try {
    const api = await getApi();
    const publicKey = c.request.requestBody.publicKey;

    const addProviderData = {
      authorizedMsaId: providerId,
      expiration: c.request.requestBody.expiration,
      schemaIds: addProviderSchemas,
    };

    const createSponsoredAccountWithDelegation = api.tx.msa.createSponsoredAccountWithDelegation(
      publicKey,
      { Sr25519: c.request.requestBody.addProviderSignature },
      addProviderData
    );

    const handleBytes = api.registry.createType("Bytes", c.request.requestBody.baseHandle);
    const handlePayload = {
      baseHandle: handleBytes,
      expiration: c.request.requestBody.expiration,
    };

    const claimHandle = api.tx.handles.claimHandle(
      publicKey,
      { Sr25519: c.request.requestBody.handleSignature },
      handlePayload
    );

    // Validate the expiration and the signature before submitting them
    const blockNum = await getCurrentBlockNumber();
    if (blockNum > handlePayload.expiration) return res.status(409).send();

    const claimHandlePayload = api.registry.createType("CommonPrimitivesHandlesClaimHandlePayload", handlePayload);

    const { isValid } = signatureVerify(
      claimHandlePayload.toU8a(),
      hexToU8a(c.request.requestBody.handleSignature),
      publicKey
    );
    if (!isValid) return res.status(401).send();

    const calls = [createSponsoredAccountWithDelegation, claimHandle];

    // TEMP: Undo the actual submission for now.s
    // Trigger it and just log if there is an error later
    await api.tx.frequencyTxPayment
      .payWithCapacityBatchAll(calls)
      .signAndSend(getProviderKey(), { nonce: await getNonce() }, ({ status, dispatchError }) => {
        if (dispatchError) {
          console.error("ERROR: ", dispatchError.toHuman());
        } else if (status.isInBlock || status.isFinalized) {
          console.log("Account Created", status.toHuman());
        }
      });

    const response: T.Paths.AuthCreate.Responses.$200 = {
      accessToken: await createAuthToken(c.request.requestBody.publicKey),
      expires: Date.now() + 60 * 60 * 24,
    };
    return res.status(200).json(response);
  } catch (e) {
    console.error(e);
    return res.status(500).send();
  }
};

export const authAccount: Handler<{}> = async (c, _req, res) => {
  try {
    const msaId = c.security?.tokenAuth?.msaId;
    if (msaId === null) return res.status(202).send();

    const api = await getApi();
    const handleResp = await api.rpc.handles.getHandleForMsa(msaId);
    // Handle still being created...
    // TODO: Be OK with no handle
    if (handleResp.isEmpty) return res.status(202).send();

    const handle = handleResp.value.toJSON();

    const response: T.Paths.AuthAccount.Responses.$200 = {
      displayHandle: `${handle.base_handle}.${handle.suffix}`,
      dsnpId: msaId,
    };
    return res.status(200).json(response);
  } catch (e) {
    console.error(e);
    return res.status(500).send();
  }
};

export const authDelegate: Handler<T.Paths.AuthDelegate.RequestBody> = async (c, _req, res) => {
  const response: T.Paths.AuthDelegate.Responses.$200 = {
    accessToken: await createAuthToken(c.request.requestBody.publicKey),
    expires: Date.now() + 60 * 60 * 24,
  };
  return res.status(200).json(response);
};

export const authHandles: Handler<T.Paths.AuthHandles.RequestBody> = async (c, _req, res) => {
  const response: T.Paths.AuthHandles.Responses.$200 = [];
  const api = await getApi();
  for await (const publicKey of c.request.requestBody) {
    const msaId = await api.query.msa.publicKeyToMsaId(publicKey);
    if (msaId.isSome) {
      const handle = await api.rpc.handles.getHandleForMsa(msaId.value);
      if (handle.isSome) {
        response.push({
          publicKey,
          handle: `${handle.value.base_handle}.${handle.value.suffix}`,
        });
      }
    }
  }
  return res.status(200).json(response);
};
