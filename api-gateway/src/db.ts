import type { Database, MarketSignal, NormalizedSignalPayload, SignalInsertResult } from "./types.js";

type QueryResult<T> = { readonly rows: readonly T[] };
type PoolLike = { query<T>(text: string, params?: readonly unknown[]): Promise<QueryResult<T>>; end?(): Promise<void> };

export class PostgresDatabase implements Database {
  public constructor(private readonly pool: PoolLike) {}

  public async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch (error) {
      console.error("Database health check failed", { error: error instanceof Error ? error.message : "unknown" });
      return false;
    }
  }

  public async insertSignal(signal: NormalizedSignalPayload): Promise<SignalInsertResult> {
    const sql = `INSERT INTO market_signals (signal_id, symbol, direction, entry_price, stop_loss, take_profit_1, take_profit_2, take_profit_3, timeframe, candle_timestamp)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (signal_id) DO NOTHING
      RETURNING id, signal_id, symbol, direction, entry_price::text, stop_loss::text, take_profit_1::text, take_profit_2::text, take_profit_3::text, timeframe, candle_timestamp::text, is_active, created_at::text`;
    const params = [signal.signal_id, signal.symbol, signal.direction, signal.entry, signal.stop_loss, signal.tp1, signal.tp2, signal.tp3, signal.timeframe, signal.candle_timestamp];
    const inserted = await this.pool.query<MarketSignal>(sql, params);
    if (inserted.rows[0] !== undefined) return { inserted: true, signal: inserted.rows[0] };
    const existing = await this.pool.query<MarketSignal>("SELECT id, signal_id, symbol, direction, entry_price::text, stop_loss::text, take_profit_1::text, take_profit_2::text, take_profit_3::text, timeframe, candle_timestamp::text, is_active, created_at::text FROM market_signals WHERE signal_id = $1", [signal.signal_id]);
    if (existing.rows[0] === undefined) throw new Error("Signal insert conflict could not be resolved");
    return { inserted: false, signal: existing.rows[0] };
  }

  public async getActiveSignals(filters: { readonly symbol?: string; readonly limit: number }): Promise<readonly MarketSignal[]> {
    const params: unknown[] = [];
    const clauses = ["is_active = TRUE"];
    if (filters.symbol !== undefined) {
      params.push(filters.symbol);
      clauses.push(`symbol = $${params.length}`);
    }
    params.push(filters.limit);
    const sql = `SELECT id, signal_id, symbol, direction, entry_price::text, stop_loss::text, take_profit_1::text, take_profit_2::text, take_profit_3::text, timeframe, candle_timestamp::text, is_active, created_at::text FROM market_signals WHERE ${clauses.join(" AND ")} ORDER BY created_at DESC LIMIT $${params.length}`;
    return (await this.pool.query<MarketSignal>(sql, params)).rows;
  }

  public async getFavoriteFirebaseTokens(symbol: string): Promise<readonly string[]> {
    const result = await this.pool.query<{ readonly firebase_token: string }>("SELECT DISTINCT u.firebase_token FROM users u JOIN user_favorites f ON f.user_id = u.id WHERE f.symbol = $1 AND u.firebase_token IS NOT NULL", [symbol]);
    return result.rows.map((row) => row.firebase_token);
  }
}

interface PgPoolConstructor { new (config: { readonly connectionString: string; readonly max: number; readonly idleTimeoutMillis: number; readonly connectionTimeoutMillis: number }): PoolLike }
interface PgModule { readonly Pool: PgPoolConstructor }

function isPgModule(value: unknown): value is PgModule {
  return typeof value === "object" && value !== null && "Pool" in value;
}

export async function createPostgresDatabase(databaseUrl: string): Promise<PostgresDatabase> {
  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;
  const module = await dynamicImport("pg");
  if (!isPgModule(module)) throw new Error("pg module is unavailable");
  const pool = new module.Pool({ connectionString: databaseUrl, max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 });
  return new PostgresDatabase(pool);
}
