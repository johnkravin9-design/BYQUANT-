import type { IncomingMessage, ServerResponse } from "node:http";

export interface RouteResult {
  readonly handled: boolean;
}

export function handleHealthRoute(request: IncomingMessage, response: ServerResponse): RouteResult {
  if (request.method !== "GET" || request.url !== "/health") {
    return { handled: false };
  }

  response.statusCode = 200;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify({ status: "ok", service: "byquant-api-gateway" }));
  return { handled: true };
}
