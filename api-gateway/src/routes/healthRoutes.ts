import type { RequestHandler } from "../server.js";

export function createHealthRoute(healthCheck: () => Promise<boolean>): RequestHandler {
  return async (request, response) => {
    if (request.method !== "GET" || request.url.pathname !== "/health") return false;
    const databaseOk = await healthCheck();
    response.statusCode = databaseOk ? 200 : 503;
    response.json({ status: databaseOk ? "ok" : "error", database: databaseOk ? "ok" : "unavailable" });
    return true;
  };
}
