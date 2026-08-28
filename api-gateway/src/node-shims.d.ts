declare module "node:http" {
  export interface IncomingMessage { method?: string; url?: string; headers: Record<string, string | string[] | undefined>; [Symbol.asyncIterator](): AsyncIterator<string | { toString(encoding?: string): string }>; }
  export interface ServerResponse { statusCode: number; setHeader(name: string, value: string): void; end(data?: string): void; }
  export interface Server { listen(port: number, callback?: () => void): Server; close(callback?: (error?: Error) => void): void; address(): { port: number } | string | null; }
  export function createServer(requestListener: (request: IncomingMessage, response: ServerResponse) => void): Server;
}
declare module "node:assert/strict" { const assert: { equal(actual: unknown, expected: unknown, message?: string): void; deepEqual(actual: unknown, expected: unknown, message?: string): void; ok(value: unknown, message?: string): void; }; export default assert; }
declare module "node:test" { export function describe(name: string, fn: () => void): void; export function it(name: string, fn: () => void | Promise<void>): void; }
declare module "node:fs" { export function existsSync(path: string): boolean; export function readFileSync(path: string, encoding: string): string; }
declare module "node:path" { export function resolve(...paths: string[]): string; }
declare const process: { env: Record<string, string | undefined>; argv: readonly string[]; cwd(): string; exit(code?: number): never; };
declare function fetch(input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<{ ok: boolean; status: number; headers: { get(name: string): string | null }; json(): Promise<unknown>; }>;

interface NodeBuffer extends Uint8Array { toString(encoding?: string): string; }
declare const Buffer: {
  from(value: string | Uint8Array | ArrayBuffer, encoding?: string): NodeBuffer;
  concat(list: readonly NodeBuffer[]): NodeBuffer;
};
declare module "node:crypto" {
  export interface Signer { update(data: string): Signer; end(): void; sign(privateKey: string): NodeBuffer; }
  export function createSign(algorithm: string): Signer;
  export function timingSafeEqual(a: NodeBuffer, b: NodeBuffer): boolean;
  export function randomUUID(): string;
}
