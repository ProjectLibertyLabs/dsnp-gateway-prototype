// Config first
import "dotenv/config";
// Augment Polkadot Types First
import "@frequency-chain/api-augment";
import * as openapiBackend from "openapi-backend";
import Express from "express";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import cors from "cors";
import axios from "axios";
import { load } from "cheerio";

import type { Request } from "openapi-backend";

import * as auth from "./handlers/auth.js";
import * as content from "./handlers/content.js";
import * as graph from "./handlers/graph.js";
import * as profile from "./handlers/profile.js";
import * as interaction from "./handlers/interaction.js";

import openapiJson from "./openapi.json" assert { type: "json" };
import { getApi } from "./services/frequency.js";
import { getAccountFromAuth } from "./services/auth.js";

// For Beckn prototype
import "services/ondc-entitlement-checker.ts";

// Support BigInt JSON
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = Express();
app.use(Express.json());

// define api
const api = new openapiBackend.OpenAPIBackend({
  definition: "openapi.json",
  handlers: {
    ...auth,
    ...content,
    ...graph,
    ...profile,
    ...interaction,

    validationFail: async (c, req: Express.Request, res: Express.Response) =>
      res.status(400).json({ err: c.validation.errors }),
    notFound: async (c, req: Express.Request, res: Express.Response) => res.status(404).json({ err: "not found" }),
  },
});

api.init();

// cors
app.use(cors());

// logging
app.use(morgan("combined"));

// Swagger UI
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiJson));

// Simple Token Auth
api.registerSecurityHandler("tokenAuth", async (c) => {
  if (typeof c.request.headers.authorization !== "string") return false;
  const token = c.request.headers.authorization.split(" ")[1];
  const account = await getAccountFromAuth(token);

  if (account === null) return false;

  // truthy return values are interpreted as auth success
  // you can also add any auth information to the return value
  return account;
});

api.register("unauthorizedHandler", (_c, _req, res) => {
  return res.status(401).send();
});

app.get("/preview", async (req, res) => {
  try {
    //get url to generate preview, the url will be based as a query param.

    const url = req.query.url as string;
    /*request url html document*/
    const { data } = await axios.get(url);
    //load html document in cheerio
    const dom = load(data);
    /*function to get needed values from meta tags to generate preview*/
    const getMetaTag = (name: string) => {
      return (
        dom(`meta[name=${name}]`).attr("content") ||
        dom(`meta[property="twitter${name}"]`).attr("content") ||
        dom(`meta[property="og:${name}"]`).attr("content")
      );
    };

    /*Fetch values into an object */
    const preview = {
      title: dom("title").first().text(),
      description: getMetaTag("description"),
      image: getMetaTag("image"),
    };

    //Send object as response
    res.status(200).json(preview);
  } catch (error) {
    res.status(500).json(error);
  }
});

// use as express middleware
app.use((req, res) => api.handleRequest(req as Request, req, res));

const port = parseInt(process.env.PORT || "0") || "5005";
// start server
app.listen(port, () => {
  getApi().catch((e) => {
    console.error("Error connecting to Frequency Node!!", e.message);
  });
  console.info(`api listening at http://localhost:${port}\nOpenAPI Docs at http://localhost:${port}/docs`);
});
