declare module "node:http" {
  export interface IncomingMessage {
    method?: string;
    url?: string;
  }

  export interface ServerResponse {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(data?: string): void;
  }

  export interface Server {
    listen(port: number, callback?: () => void): Server;
    close(callback?: (error?: Error) => void): void;
    address(): { port: number } | string | null;
  }

  export function createServer(
    requestListener: (request: IncomingMessage, response: ServerResponse) => void,
  ): Server;
}

declare module "node:assert/strict" {
  const assert: {
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
  };
  export default assert;
}

declare module "node:test" {
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
}

declare const process: {
  env: Record<string, string | undefined>;
  argv: readonly string[];
};

declare function fetch(input: string): Promise<{
  status: number;
  json(): Promise<unknown>;
}>;
