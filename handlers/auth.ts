import { Handler } from "openapi-backend";
import type * as T from "../types/openapi";
import { getApi, getNonce, getProviderHttp, getProviderKey } from "../services/frequency";
import { generateChallenge, createAuthToken, getMsaByPublicKey, useChallenge } from "../services/auth";
import { AnnouncementType } from "../services/dsnp";
import { getSchemaId } from "../services/announce";

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
  const { publicKey, encodedValue: _encodedValue, challenge } = c.request.requestBody;
  const msaId = await getMsaByPublicKey(publicKey);
  if (!msaId || !useChallenge(challenge)) return res.status(401).send();
  // TODO: Validate Challenge signature
  // _encodedValue

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
    providerId,
    schemas: addProviderSchemas,
  };
  return res.status(200).json(response);
};

export const authDidCreate: Handler<T.Paths.AuthCreateWithDid.RequestBody> = async (c, _req, res) => {
  try {
    const api = await getApi();

    // TODO: Validate the expiration and the signature before submitting them
    const createSponsoredMsaWithDidParams = {
      authorizedMsaId: providerId,
      schemaIds: addProviderSchemas,
    };
    const expiration = c.request.requestBody.expiration;
    const identifier = c.request.requestBody.identifier;
    console.log("c.request.requestBody.proof", c.request.requestBody.proof);
    const proof = c.request.requestBody.proof;


    const createSponsoredAccountWithDelegation = api.tx.msa.createSponsoredMsaWithDid(providerId, addProviderSchemas);

    // const handleBytes = api.registry.createType("Bytes", c.request.requestBody.baseHandle);
    // const handlePayload = {
    //   baseHandle: handleBytes,
      
    //   expiration: c.request.requestBody.expiration,
    // };

    // const claimHandle = api.tx.handles.claimHandleForDid(handlePayload);
    // 0x4801a8dacfa33d9cd0612382d536e6bb6f4ccb3e1767b2eefbdbcb9eb01819dac00d0834800600204b04656e6464790000947f040cfcdc16b3384bd72777296b6384ac9a6c64fd9b49ecb6dcb21f683391b531b701000008002cfcdc16b3384bd72777296b6384ac9a6c64fd9b49ecb6dcb21f683391b531b701000001a8dacfa33d9cd0612382d536e6bb6f4ccb3e1767b2eefbdbcb9eb01819dac00d0b0000000114656e646479b20000000102f0d44c931dc07a91b94253684b115bd512ca3277c97bccff615bbce7517a4062d16cdba0319c99b68bf30de1f69c87b36bce021541fb77610bcc93425de38f1d0100003c0e01000000000000001c0100020003000400050006000800
    const dispatchAsCall = api.tx.dipConsumer.dispatchAs(identifier, proof, createSponsoredAccountWithDelegation);
    console.log("dispatchAsCall", dispatchAsCall.toHex())

    // const calls = [createSponsoredAccountWithDelegation, claimHandle];
    const calls = [dispatchAsCall];

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
      accessToken: await createAuthToken(c.request.requestBody.identifier),
      expires: Date.now() + 60 * 60 * 24,
    };
    return res.status(200).json(response);
  } catch (e) {
    console.error(e);
    return res.status(500).send();
  }
};

export const authCreate: Handler<T.Paths.AuthCreate.RequestBody> = async (c, _req, res) => {
  try {
    const api = await getApi();
    const publicKey = c.request.requestBody.publicKey;

    // TODO: Validate the expiration and the signature before submitting them
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
