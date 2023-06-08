import { Handler } from "openapi-backend";
import type * as T from "../types/openapi";

export const userFollowing: Handler<{}> = async (c, req, res) => {
  // , T.Paths.UserFollowing.PathParameters
  const response: T.Paths.UserFollowing.Responses.$200 = [];
  return res.status(200).json(response);
};

export const graphFollow: Handler<{}> = async (c, req, res) => {
  // , T.Paths.GraphFollow.PathParameters
  return res.status(201);
};

export const graphUnfollow: Handler<{}> = async (c, req, res) => {
  // , T.Paths.GraphUnfollow.PathParameters
  return res.status(201);
};
