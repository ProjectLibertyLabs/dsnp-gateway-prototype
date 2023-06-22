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
    dsnpId: 2,
  };
  return res.status(200).json(response);
};

export const authLogout: Handler<{}> = async (_c, _req, res) => {
  return res.status(201);
};

export const authProvider: Handler<{}> = async (_c, _req, res) => {
  const response: T.Paths.AuthProvider.Responses.$200 = {
    providerId: 1,
    schemas: [1, 2, 3],
  };
  return res.status(200).json(response);
};

export const authCreate: Handler<T.Paths.AuthCreate.RequestBody> = async (c, _req, res) => {
  const response: T.Paths.AuthCreate.Responses.$200 = {
    accessToken: "",
    expiresIn: 0,
    displayHandle: `${c.request.requestBody.baseHandle}.123`,
    dsnpId: 123,
  };
  return res.status(200).json(response);
};

export const authDelegate: Handler<T.Paths.AuthDelegate.RequestBody> = async (_c, _req, res) => {
  const response: T.Paths.AuthDelegate.Responses.$200 = {
    accessToken: "",
    expiresIn: 0,
  };
  return res.status(200).json(response);
};

export const authHandles: Handler<T.Paths.AuthHandles.RequestBody> = async (_c, _req, res) => {
  const response: T.Paths.AuthHandles.Responses.$200 = [
    {
      publicKey: "5f",
      handle: "test.34",
    },
  ];
  return res.status(200).json(response);
};
