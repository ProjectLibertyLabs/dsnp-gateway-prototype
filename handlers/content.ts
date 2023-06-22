import { Context, Handler } from "openapi-backend";
import Busboy from 'busboy';
import FormData from 'form-data';
import type * as T from "../types/openapi";
import { ipfsPin } from "../services/ipfs";
import { createImageAttachment, createImageLink, createNote } from "@dsnp/activity-content/factories";

type Fields = Record<string, string>;
type File = {
  name: string,
  file: Buffer,
  info: Busboy.FileInfo,
};

export const getUserFeed: Handler<{}> = async (c: Context<{}, {}, T.Paths.GetUserFeed.QueryParameters>, _req, res) => {
  /// T.Paths.GetFeed.PathParameters, T.Paths.GetFeed.QueryParameters,
  const { startBlockNumber } = c.request.query;
  const response: T.Paths.GetUserFeed.Responses.$200 = {
    newestBlockNumber: startBlockNumber || 100,
    oldestBlockNumber: 1,
    posts: [] as any,
  };
  return res.status(200).json(response);
};

export const getFeed: Handler<{}> = async (c: Context<{}, {}, T.Paths.GetFeed.QueryParameters>, req, res) => {
  const { startBlockNumber } = c.request.query;
  const response: T.Paths.GetFeed.Responses.$200 = {
    newestBlockNumber: startBlockNumber || 100,
    oldestBlockNumber: 1,
    posts: [] as any,
  };
  return res.status(200).json(response);
};

export const createBroadcast: Handler<T.Paths.CreateBroadcast.RequestBody> = async (_c, req, res) => {

  console.log("createBroadcast");
  try {

    const bb = Busboy({ headers: req.headers });

    const formAsync: Promise<[Fields, File[]]> = new Promise((resolve, reject) => {
      const files: File[] = [];
      const fields: Fields = {}
      bb.on('file', (name, file, info) => {
        // Take the file to a in memory buffer. This might be a bad idea.
        const chunks: any[] = [];
        file.on('data', (chunk) => {
          chunks.push(chunk);
        }).on('close', () => {
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
      }).on("error", (e) => {
        reject(e);
      })
      .on('close', () => {
        console.log("finish");
        resolve([fields, files]);
      });
    });
    req.pipe(bb);
    const [fields, files] = await formAsync;

    console.log("fields", fields);
    console.log("files", files);
    // console.log("content", form.);
    // console.log("images", images);
    const imagePins = await Promise.all(files.filter(x => x.name === "images").map(async (image) => {
      await ipfsPin(image.info.mimeType, image.file);
      // createImageAttachment(createImageLink())
    }));

    console.log("imagePins", imagePins);

    // const note = createNote(content, new Date(), {  });

    const response: T.Paths.CreateBroadcast.Responses.$200 = {
      fromId: 123,
      contentHash: "0xabcd",
      content: fields.content,
      timestamp: new Date().toISOString(),
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
