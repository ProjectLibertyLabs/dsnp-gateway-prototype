import { Handler } from "openapi-backend";
import type * as T from "../types/openapi";

export const getProfile: Handler<{}> = async (c, req, res) => {
  // T.Paths.GetProfile.PathParameters
  const response: T.Paths.GetProfile.Responses.$200 = {
    fromId: 123,
    contentHash: "0xabcd",
    content: "",
    timestamp: new Date().toISOString(),
  };
  return res.status(200).json(response);
};

export const createProfile: Handler<T.Paths.CreateProfile.RequestBody> = async (
  // T.Paths.CreateProfile.PathParameters
  c,
  req,
  res
) => {
  const response: T.Paths.CreateProfile.Responses.$200 = {
    fromId: 123,
    contentHash: "0xabcd",
    content: "",
    timestamp: new Date().toISOString(),
  };
  return res.status(200).json(response);
};
