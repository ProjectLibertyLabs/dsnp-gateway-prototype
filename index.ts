import OpenAPIBackend from "openapi-backend";
import Express from "express";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import type { Request } from "openapi-backend";

import * as auth from "./handlers/auth";
import * as content from "./handlers/content";
import * as graph from "./handlers/graph";
import * as profile from "./handlers/profile";

const app = Express();
app.use(Express.json());

// define api
const api = new OpenAPIBackend({
  definition: "./openapi.json",
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

// logging
app.use(morgan("combined"));

// Swagger UI
app.use("/docs", swaggerUi.serve, swaggerUi.setup(require("./openapi.json")));

// use as express middleware
app.use((req, res) => api.handleRequest(req as Request, req, res));

// start server
app.listen(3000, () => console.info("api listening at http://localhost:3000\nOpenAPI Docs at http://localhost:3000/docs"));
