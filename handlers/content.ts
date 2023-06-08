import { Handler } from "openapi-backend";
import type * as T from "../types/openapi";

export const getUserFeed: Handler<{}> = async (c, _req, res) => {
  /// T.Paths.GetFeed.PathParameters, T.Paths.GetFeed.QueryParameters,
  const response: T.Paths.GetUserFeed.Responses.$200 = [];
  return res.status(200).json(response);
};

export const getFeed: Handler<{}> = async (_c, _req, res) => {
  /// T.Paths.GetFeed.PathParameters, T.Paths.GetFeed.QueryParameters,
  const response: T.Paths.GetFeed.Responses.$200 = [];
  return res.status(200).json(response);
};

export const createBroadcast: Handler<T.Paths.CreateBroadcast.RequestBody> = async (c, _req, res) => {
  const response: T.Paths.CreateBroadcast.Responses.$200 = {
    fromId: 123,
    contentHash: "0xabcd",
    content: "",
    timestamp: new Date().toISOString(),
    replies: [],
  };
  return res.status(200).json(response);
};

export const getContent: Handler<{}> = async (c, _req, res) => {
  // T.Paths.GetContent.PathParameters
  if (c.request.params.dsnpId === "123") {
    const response: T.Paths.GetContent.Responses.$200 = {
      fromId: 123,
      contentHash: "0xabcd",
      content: "",
      timestamp: new Date().toISOString(),
      replies: [],
    };
    return res.status(200).json(response);
  }
  return res.status(404);
};

export const editContent: Handler<T.Paths.EditContent.RequestBody> = async (
  // , T.Paths.EditContent.PathParameters
  c,
  _req,
  res
) => {
  const response: T.Paths.EditContent.Responses.$200 = {
    fromId: 123,
    contentHash: "0xabcd",
    content: "",
    timestamp: new Date().toISOString(),
    replies: [],
  };
  return res.status(200).json(response);
};
