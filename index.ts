// Config first
import "dotenv/config";
// Augment Polkadot Types First
import "@frequency-chain/api-augment";
import * as openapiBackend from "openapi-backend";
import Express from "express";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import cors from "cors";

import type { Request } from "openapi-backend";

import * as auth from "./handlers/auth";
import * as content from "./handlers/content";
import * as graph from "./handlers/graph";
import * as profile from "./handlers/profile";

import openapiJson from "./openapi.json" assert { type: "json" };
import { getApi } from "./services/frequency";

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

// use as express middleware
app.use((req, res) => api.handleRequest(req as Request, req, res));

// start server
app.listen(5000, () => {
  getApi().catch((e) => {
    console.error("Error connecting to Frequency Node!!", e.message);
  });
  console.info("api listening at http://localhost:5000\nOpenAPI Docs at http://localhost:5000/docs");
});
