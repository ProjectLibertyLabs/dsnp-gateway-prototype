import { Handler } from "openapi-backend";
// TODO: Figure out a better way to handle the type checking of the OpenAPI
import type * as T from "../types/openapi.js";
import {
  getApi,
  getCurrentBlockNumber,
  getNetwork,
  getNonce,
  getProviderHttp,
  getProviderKey,
} from "../services/frequency.js";
import {
  generateChallenge,
  createAuthToken,
  getMsaByPublicKey,
  useChallenge,
} from "../services/auth.js";
import { AnnouncementType } from "../services/dsnp.js";
import { getSchemaId } from "../services/announce.js";
import { getIpfsGateway } from "../services/ipfs.js";
import { signatureVerify } from "@polkadot/util-crypto";
import { hexToU8a, numberToU8a } from "@polkadot/util";
import { parseMessage, SiwsMessage } from "@talismn/siws";

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

// TODO: Make work with `@frequency-chain/siwf`
export const authLogin2: Handler<T.Paths.AuthLogin2.RequestBody> = async (
  c,
  _req,
  res,
) => {
  const { signIn, signUp } = c.request.requestBody;
  const api = await getApi();
  if (signUp?.extrinsics) {
    // TODO: (Might be part of the library)
    // Verify each call's data, signatures, and expiration

    const transactions = signUp?.extrinsics.map((e) => e.encodedExtrinsic);
    const txns = transactions?.map((t) => api.tx(t));
    const calls = api.registry.createType("Vec<Call>", txns);

    await api.tx.frequencyTxPayment
      .payWithCapacityBatchAll(calls)
      .signAndSend(
        getProviderKey(),
        { nonce: await getNonce() },
        ({ status, dispatchError }) => {
          if (dispatchError) {
            console.error("ERROR in Signup: ", dispatchError.toHuman());
          } else if (status.isInBlock || status.isFinalized) {
            console.log("Account signup processed", status.toHuman());
          }
        },
      );
  }
  // Is signin always required? Assume Yes for now for this code
  if (signIn.siwsPayload) {
    const parsedSignin = parseMessage(signIn.siwsPayload.message);
    const publicKey = parsedSignin.address;
    // TODO Verification like domain
    if (false && parsedSignin.domain !== "") {
      // return res.status(401).send();
    }
    // Verify Signature
    const { isValid } = signatureVerify(
      parsedSignin.prepareMessage(),
      signIn.siwsPayload?.signature,
      publicKey,
    );
    if (!isValid) return res.status(401).send();

    // TODO: Burn the nonce for as long as expiration is to stop MitM attacks
    // if (isNonceValid(parsedSignin.nonce, parsedSignin.expirationTime) {
    //   return res.status(401).send();
    // }

    const response: T.Paths.AuthLogin2.Responses.$200 = {
      accessToken: await createAuthToken(publicKey),
      expires: Date.now() + 60 * 60 * 24,
    };
    return res.status(200).json(response);
  }

  // We got some bad data if we got here.
  return res.status(500).send();
};

export const authLogout: Handler<{}> = async (_c, _req, res) => {
  return res.status(201);
};

// TODO: Figure out a better way to do this perhaps?
// It provides to the frontend the various direct conenctions it might need
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

// This allows the user to get their logged in MSA.
// TODO: Figure out how to handle the time between when a user signs up and user has an MSA
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
