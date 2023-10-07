import { Context, Handler } from "openapi-backend";
import Busboy from "busboy";
import type * as T from "../types/openapi.js";
import { ipfsPin, ipfsUrl } from "../services/ipfs.js";
import * as dsnp from "../services/dsnp.js";
import { factories } from "@dsnp/activity-content";
import type { ActivityContentNote, ActivityContentTag, ActivityContentInteraction } from "@dsnp/activity-content/types";
import { publish } from "../services/announce.js";
import { getPostsInRange } from "../services/feed.js";
import { getCurrentBlockNumber } from "../services/frequency.js";
import { getMsaByPublicKey } from "../services/auth.js";
import { getPublicFollows } from "../services/graph.js";

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
  const oldest = Math.max(1, oldestBlockNumber || 1, newest - 45_000); // 45k blocks at a time max

  const msaId = (c.request.params as any).dsnpId;

  if (typeof msaId !== "string") {
    return res.status(404).send();
  }

  const posts = await getPostsInRange(newest, oldest);
  const response: T.Paths.GetUserFeed.Responses.$200 = {
    newestBlockNumber: newest,
    oldestBlockNumber: oldest,
    posts: posts.filter((x) => x.fromId === msaId),
  };
  return res.status(200).json(response);
};

export const getFeed: Handler<{}> = async (c: Context<{}, {}, T.Paths.GetFeed.QueryParameters>, _req, res) => {
  // Return only items from who the user follows
  const msaId = c.security.tokenAuth.msaId || (await getMsaByPublicKey(c.security.tokenAuth.publicKey));

  if (typeof msaId !== "string") {
    return res.status(404).send();
  }

  const { newestBlockNumber, oldestBlockNumber } = c.request.query;
  // Default to now
  const newest = newestBlockNumber ?? (await getCurrentBlockNumber());
  const oldest = Math.max(1, oldestBlockNumber || 1, newest - 45_000); // 45k blocks at a time max

  try {
    const following = await getPublicFollows(msaId);

    const posts = await getPostsInRange(newest, oldest);
    const response: T.Paths.GetFeed.Responses.$200 = {
      newestBlockNumber: newest,
      oldestBlockNumber: oldest,
      posts: posts.filter((x) => following.includes(x.fromId)),
    };
    return res.status(200).json(response);
  } catch (e) {
    console.error("Error fetching feed for current user", e);
    return res.status(500).send();
  }
};

export const getDiscover: Handler<{}> = async (c: Context<{}, {}, T.Paths.GetDiscover.QueryParameters>, _req, res) => {
  const { newestBlockNumber, oldestBlockNumber } = c.request.query;
  // Default to now
  const newest = newestBlockNumber ?? (await getCurrentBlockNumber());
  const oldest = Math.max(1, oldestBlockNumber || 1, newest - 45_000); // 45k blocks at a time max

  const posts = await getPostsInRange(newest, oldest);
  const response: T.Paths.GetFeed.Responses.$200 = {
    newestBlockNumber: newest,
    oldestBlockNumber: oldest,
    posts: posts,
  };
  return res.status(200).json(response);
};

export const getInteractionsFeed: Handler<{}> = async (c: Context<{}, {}, T.Paths.GetInteractionsFeed.QueryParameters>, req, res) => {
  // Return only items that have a tag with type Interaction and matching rel/href values
  const { newestBlockNumber, oldestBlockNumber, rel, href } = c.request.query;
  // Default to now
  const newest = newestBlockNumber ?? (await getCurrentBlockNumber());
  const oldest = Math.max(1, oldestBlockNumber || 1, newest - 45_000); // 45k blocks at a time max

  try {
    const posts = await getPostsInRange(newest, oldest);
    const response: T.Paths.GetFeed.Responses.$200 = {
      newestBlockNumber: newest,
      oldestBlockNumber: oldest,
      posts: posts.filter((x) => {
        const note: ActivityContentNote = JSON.parse(x.content);
        if (!note.tag) return false;

        const isInteraction = (tag: ActivityContentTag): tag is ActivityContentInteraction => {
          return (tag as any).type?.toLowerCase() === "interaction";
        }

        const hasMatchingInteraction = (tag: ActivityContentTag) =>
          (isInteraction(tag) && (!rel || rel === tag.rel) && (!href || href === tag.href));

        if (Array.isArray(note.tag)) {
          for (const tag of note.tag) {
            if (hasMatchingInteraction(tag)) return true;
          }
          return false;
        } else {
          return hasMatchingInteraction(note.tag);
        }
      }),
    };
    return res.status(200).json(response);
  } catch (e) {
    console.error("Error fetching feed for current user", e);
    return res.status(500).send();
  }
};

export const createBroadcast: Handler<T.Paths.CreateBroadcast.RequestBody> = async (c, req, res) => {
  try {
    const msaId = c.security.tokenAuth.msaId || (await getMsaByPublicKey(c.security.tokenAuth.publicKey));
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
          return factories.createImageAttachment([
            factories.createImageLink(ipfsUrl(cid), image.info.mimeType, [hash]),
          ]);
        })
    );

    const params = { attachment, tag: undefined };
    if (fields.tag) {
      params.tag = JSON.parse(fields.tag);
    }
    const note = factories.createNote(fields.content, new Date(), params);
    const noteString = JSON.stringify(note);
    console.log("Made note: ", noteString);
    const { cid, hash: contentHash } = await ipfsPin("application/json", Buffer.from(noteString, "utf8"));

    const announcement = fields.inReplyTo
      ? dsnp.createReply(msaId!, ipfsUrl(cid), contentHash, fields.inReplyTo)
      : dsnp.createBroadcast(msaId!, ipfsUrl(cid), contentHash);

    // Add it to the batch and publish
    await publish([announcement]);

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
