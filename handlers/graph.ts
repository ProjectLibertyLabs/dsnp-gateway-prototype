import { Handler } from "openapi-backend";
import type * as T from "../types/openapi.js";
import { getMsaByPublicKey } from "../services/auth.js";
import { follow, getPublicFollows, unfollow } from "../services/graph.js";

export const userFollowing: Handler<{}> = async (c, _req, res) => {
  const msaId = c.request.params.dsnpId;

  if (typeof msaId !== "string") {
    return res.status(404).send();
  }

  const follows = await getPublicFollows(msaId);

  const response: T.Paths.UserFollowing.Responses.$200 = follows;
  return res.status(200).json(response);
};

export const graphFollow: Handler<{}> = async (c, _req, res) => {
  const msaId = c.security.tokenAuth.msaId || (await getMsaByPublicKey(c.security.tokenAuth.publicKey));
  const objectMsaId = c.request.params.dsnpId;

  if (typeof objectMsaId !== "string") {
    return res.status(404).send();
  }

  await follow(msaId, parseInt(objectMsaId));

  return res.status(201).send();
};

export const graphUnfollow: Handler<{}> = async (c, _req, res) => {
  const msaId = c.security.tokenAuth.msaId || (await getMsaByPublicKey(c.security.tokenAuth.publicKey));
  const objectMsaId = c.request.params.dsnpId;

  if (typeof objectMsaId !== "string") {
    return res.status(404).send();
  }

  await unfollow(msaId, parseInt(objectMsaId));

  return res.status(201).send();
};
