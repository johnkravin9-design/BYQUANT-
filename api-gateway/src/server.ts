import { createServer, type Server } from "node:http";

import { loadConfig } from "./config.js";
import { handleHealthRoute } from "./routes/healthRoutes.js";

export function createApp(): Server {
  return createServer((request, response) => {
    if (handleHealthRoute(request, response).handled) {
      return;
    }

    response.statusCode = 404;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ error: "not_found" }));
  });
}

const entrypoint = process.argv[1] ?? "";

if (entrypoint.endsWith("server.js")) {
  const config = loadConfig();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`ByQuant API gateway listening on port ${config.port}`);
  });
}
