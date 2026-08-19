export interface ApiConfig {
  readonly nodeEnv: string;
  readonly port: number;
  readonly logLevel: string;
}

export type Environment = Record<string, string | undefined>;

function readPort(value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    return 3000;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error("API_GATEWAY_PORT must be a valid TCP port");
  }
  return parsed;
}

export function loadConfig(env: Environment = process.env): ApiConfig {
  return {
    nodeEnv: env.NODE_ENV ?? "development",
    port: readPort(env.API_GATEWAY_PORT),
    logLevel: env.LOG_LEVEL ?? "info",
  };
}
