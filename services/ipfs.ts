import { blake2b256 } from '@multiformats/blake2/blake2b';
import axios from 'axios';
import FormData from 'form-data';
import { extension as getExtension } from 'mime-types';
import { toMultibase } from "@dsnp/activity-content/hash";

// Infura API credentials
const infuraProjectId = process.env.INFURA_PROJECT_ID;
const infuraProjectSecret = process.env.INFURA_PROJECT_SECRET;

const infuraAuth =
  "Basic " +
    Buffer.from(infuraProjectId +
  ":" +
  infuraProjectSecret).toString("base64");

export const infuraPin = async (filename: string, contentType: string, fileBuffer: Buffer) => {
  const infuraEndpoint = `https://ipfs.infura.io:5001/api/v0/add`;
  const form = new FormData();
  form.append('file', fileBuffer, {
    filename,
    contentType,
  });

  const headers = {
    "Content-Type": `multipart/form-data; boundary=${form.getBoundary()}`,
    Accept: "*/*",
    Connection: "keep-alive",
    authorization: infuraAuth
  };

  const response = await axios.post(infuraEndpoint, form, { headers });

  const data = response.data
  return { hash: data.Hash, fileName: data.Name, size: data.Size };
}

const hashBuffer = async (fileBuffer: Buffer): Promise<string> => {
  const hash = await blake2b256.digest(fileBuffer);
  return toMultibase(hash.bytes, "blake2b-256");
}

export const ipfsPin = async (mimeType: string, file: Buffer): Promise<string> => {

  const filename = await hashBuffer(file);
  const extension = getExtension(mimeType);
  if (extension === false) {
    throw new Error("unknown mimetype: " + mimeType);
  }
  const resp = await infuraPin(`${filename}.${extension}`, mimeType, file);
  console.log(resp);
  return `${filename}.${extension}`;
}
