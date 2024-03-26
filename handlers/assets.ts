import { Context, Handler } from "openapi-backend";
import Busboy from "busboy";
import type * as T from "../types/openapi.js";
import { ipfsPin, ipfsUrl } from "../services/ipfs.js";
import * as dsnp from "../services/dsnp.js";
import { createImageAttachment, createImageLink, createNote } from "@dsnp/activity-content/factories";
import { publish } from "../services/announce.js";
import { getPostsInRange } from "../services/feed.js";
import { getCurrentBlockNumber } from "../services/frequency.js";
import { getMsaByPublicKey } from "../services/auth.js";
import { getPublicFollows } from "../services/graph.js";
import axios from "axios";
import FormData from "form-data";

type Fields = Record<string, string>;
type File = {
  name: string;
  file: Buffer;
  info: Busboy.FileInfo;
};

export const uploadAsset: Handler<T.Paths.UploadAsset.RequestBody> = async (c, req, res) => {
  try {
    // const msaId = c.security.tokenAuth.msaId || (await getMsaByPublicKey(c.security.tokenAuth.publicKey));
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

    const formData = files.reduce((acc, file) => {
      acc.append(file.name, file.file, {
        filename: file.info.filename,
        contentType: file.info.mimeType,
      });
      return acc;
    }, new FormData());

    const response = await axios.put("http://localhost:3000/api/asset/upload", formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    console.log("enddy ---------------- response", response.data);

    // console.log("fiels", fields);
    // console.log("files", files);

    // const attachment = await Promise.all(
    //   files
    //     .filter((x) => x.name === "images")
    //     .map(async (image) => {
    //       const { cid, hash } = await ipfsPin(image.info.mimeType, image.file);
    //       return createImageAttachment([createImageLink(ipfsUrl(cid), image.info.mimeType, [hash])]);
    //     })
    // );

    // const note = createNote(fields.content, new Date(), { attachment });
    // const noteString = JSON.stringify(note);
    // const { cid, hash: contentHash } = await ipfsPin("application/json", Buffer.from(noteString, "utf8"));

    // const announcement = fields.inReplyTo
    //   ? dsnp.createReply(msaId!, ipfsUrl(cid), contentHash, fields.inReplyTo)
    //   : dsnp.createBroadcast(msaId!, ipfsUrl(cid), contentHash);

    // // Add it to the batch and publish
    // await publish([announcement]);

    // const response: T.Paths.CreateBroadcast.Responses.$200 = {
    //   ...announcement,
    //   fromId: announcement.fromId.toString(),
    //   content: noteString,
    //   timestamp: note.published,
    //   replies: [],
    // };
    return res.status(200).json(response.data);
  } catch (e) {
    console.error(e);
    return res.status(500);
  }
};
