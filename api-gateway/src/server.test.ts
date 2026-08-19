import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createApp } from "./server.js";

describe("health endpoint", () => {
  it("returns service status", async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      app.listen(0, resolve);
    });

    const address = app.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected an ephemeral TCP server address");
    }

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/health`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: "ok", service: "byquant-api-gateway" });
    } finally {
      await new Promise<void>((resolve, reject) => {
        app.close((error?: Error) => {
          if (error !== undefined) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  });
});
