import { Context, Handler } from "openapi-backend";
import Busboy from "busboy";
import type * as T from "../types/openapi";
import { ipfsPin } from "../services/ipfs";
import * as dsnp from "../services/dsnp";
import { createImageAttachment, createImageLink, createNote } from "@dsnp/activity-content/factories";
import { getMsaIdFromAuth } from "../services/auth";
import { publishBroadcast } from "../services/announce";
import { getPostsInRange } from "../services/feed";
import { getCurrentBlockNumber } from "../services/frequency";

type Fields = Record<string, string>;
type File = {
  name: string;
  file: Buffer;
  info: Busboy.FileInfo;
};

export const getUserFeed: Handler<{}> = async (c: Context<{}, {}, T.Paths.GetUserFeed.QueryParameters>, _req, res) => {
  /// T.Paths.GetFeed.PathParameters, T.Paths.GetFeed.QueryParameters,
  const { newestBlockNumber, oldestBlockNumber } = c.request.query;
  // Default to now
  const newest = newestBlockNumber ?? (await getCurrentBlockNumber());
  const oldest = Math.max(1, oldestBlockNumber || 1, newest - 10_000); // 10k blocks at a time max

  const posts = await getPostsInRange(newest, oldest);
  const response: T.Paths.GetUserFeed.Responses.$200 = {
    newestBlockNumber: newest,
    oldestBlockNumber: oldest,
    posts: posts,
  };
  return res.status(200).json(response);
};

export const getFeed: Handler<{}> = async (c: Context<{}, {}, T.Paths.GetFeed.QueryParameters>, req, res) => {
  const { newestBlockNumber, oldestBlockNumber } = c.request.query;
  // Default to now
  const newest = newestBlockNumber ?? (await getCurrentBlockNumber());
  const oldest = Math.max(1, oldestBlockNumber || 1, newest - 10_000); // 10k blocks at a time max

  const posts = await getPostsInRange(newest, oldest);
  const response: T.Paths.GetFeed.Responses.$200 = {
    newestBlockNumber: newest,
    oldestBlockNumber: oldest,
    posts: posts,
  };
  return res.status(200).json(response);
};

export const createBroadcast: Handler<T.Paths.CreateBroadcast.RequestBody> = async (c, req, res) => {
  console.log("createBroadcast");
  try {
    const msaId = await getMsaIdFromAuth(c.security);
    const bb = Busboy({ headers: req.headers });

    const formAsync: Promise<[Fields, File[]]> = new Promise((resolve, reject) => {
      const files: File[] = [];
      const fields: Fields = {};
      bb.on("file", (name, file, info) => {
        // Take the file to a in memory buffer. This might be a bad idea.
        const chunks: Buffer[] = [];
        file
          .on("data", (chunk) => {
            chunks.push(chunk);
          })
          .on("close", () => {
            files.push({
              name,
              file: Buffer.concat(chunks),
              info,
            });
          });
      })
        .on("field", (name, val, info) => {
          console.log("field", name, val, info);
          fields[name] = val;
        })
        .on("error", (e) => {
          reject(e);
        })
        .on("close", () => {
          resolve([fields, files]);
        });
    });
    req.pipe(bb);
    const [fields, files] = await formAsync;

    const attachment = await Promise.all(
      files
        .filter((x) => x.name === "images")
        .map(async (image) => {
          const { cid, hash } = await ipfsPin(image.info.mimeType, image.file);
          return createImageAttachment([createImageLink(`https://ipfs.io/ipfs/${cid}`, image.info.mimeType, [hash])]);
        })
    );

    const note = createNote(fields.content, new Date(), { attachment });
    const noteString = JSON.stringify(note);
    const { cid, hash: contentHash } = await ipfsPin("application/json", Buffer.from(noteString, "utf8"));
    const announcement = dsnp.createBroadcast(msaId, `https://ipfs.io/ipfs/${cid}`, contentHash);

    // Add it to the batch and publish
    await publishBroadcast([announcement]);

    const response: T.Paths.CreateBroadcast.Responses.$200 = {
      ...announcement,
      fromId: announcement.fromId.toString(),
      content: noteString,
      timestamp: note.published,
      replies: [],
    };
    return res.status(200).json(response);
  } catch (e) {
    console.error(e);
    return res.status(500);
  }
};

export const getContent: Handler<{}> = async (c, _req, res) => {
  // T.Paths.GetContent.PathParameters
  if (c.request.params.dsnpId === "123") {
    const response: T.Paths.GetContent.Responses.$200 = {
      fromId: "123",
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
    fromId: "123",
    contentHash: "0xabcd",
    content: "",
    timestamp: new Date().toISOString(),
    replies: [],
  };
  return res.status(200).json(response);
};
