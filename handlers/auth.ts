import { Handler } from "openapi-backend";
import type * as T from "../types/openapi";

export const authChallenge: Handler<{}> = async (_c, _req, res) => {
  const response: T.Paths.AuthChallenge.Responses.$200 = { challenge: "ok" };
  return res.status(200).json(response);
};

export const authLogin: Handler<T.Paths.AuthLogin.RequestBody> = async (c, _req, res) => {
  const response: T.Paths.AuthLogin.Responses.$200 = {
    accessToken: "",
    expiresIn: Date.now() + 60 * 60 * 24,
  };
  return res.status(200).json(response);
};

export const authLogout: Handler<{}> = async (_c, _req, res) => {
  return res.status(201);
};
