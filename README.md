# ByQuant

ByQuant generates quantitative market signals and does not execute trades or guarantee profitability.

## Architecture

ByQuant is a spot-market signal application composed of four services:

- `backend-engine/`: Python Bybit V5 Spot market-data scanner. It backfills public klines, listens to confirmed Spot kline WebSocket candles, calculates EMA9, EMA21, RSI14, OBV, and ATR14, and posts BUY-only signal payloads to the gateway.
- `api-gateway/`: strict TypeScript HTTP API. It authenticates engine webhooks, validates signal payloads, persists idempotently to PostgreSQL, exposes REST signal reads, and invokes notifications after a new insert.
- `database/`: PostgreSQL schema for users, favorites, and market signals.
- `mobile-app/`: React Native REST client and screens for Latest Signals, details, refresh, empty/error/loading states, and local favorite state.

## Repository structure

```text
backend-engine/   Python Spot signal engine and tests
api-gateway/      TypeScript API gateway, notification adapters, and tests
database/         PostgreSQL initialization schema
mobile-app/       React Native app and tests
docker-compose.yml PostgreSQL local service
.env.example      Documented environment contract template
```

## Environment variables

Copy `.env.example` to `.env` for local development. Do not commit `.env`, private Firebase service accounts, API keys, bot tokens, credentials, or production database URLs.

| Variable | Used by | Required | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | API | Yes | `development`, `test`, or production runtime value. |
| `PORT` | API | Yes | Gateway HTTP port. |
| `DATABASE_URL` | API | Yes | PostgreSQL connection string. |
| `POSTGRES_DB` | Docker/Postgres | Local | Compose database name. |
| `POSTGRES_USER` | Docker/Postgres | Local | Compose user. |
| `POSTGRES_PASSWORD` | Docker/Postgres | Local | Local password only; do not reuse in production. |
| `MIDDLEWARE_WEBHOOK_URL` | Python | Yes | Full URL for `POST /api/signals/webhook`. |
| `MIDDLEWARE_AUTH_TOKEN` | Python/API | Yes | Shared secret sent as `x-byquant-auth`. |
| `BYBIT_ENV` | Python | Yes | `testnet` or `production`; controls default V5 REST/Spot WS URLs. |
| `BYBIT_API_KEY` | Python | Optional for public data | Reserved for future authenticated Bybit calls; current scanner must not trade. |
| `BYBIT_API_SECRET` | Python | Optional for public data | Never log or commit. |
| `BYQUANT_SYMBOLS` | Python | Yes | Comma-separated Spot symbols; duplicates are removed and unsupported instruments are skipped after Bybit validation. |
| `CANDLE_INTERVAL` | Python | Yes | Bybit interval, default `60`; gateway canonical timeframe is `1h`. |
| `MARKET_WINDOW_SIZE` | Python | Yes | Bounded candle cache size. |
| `BACKFILL_LIMIT` | Python | Yes | Historical kline backfill limit. |
| `SIGNAL_DEDUPE_MAX_SIZE` | Python | Yes | Bounded duplicate-prevention key cache. |
| `TELEGRAM_BOT_TOKEN` | API notifications | Optional until Telegram enabled | Leave unset/placeholder in dry local tests. |
| `TELEGRAM_CHANNEL_ID` | API notifications | Optional until Telegram enabled | Notification failures are logged without deleting signals. |
| `FIREBASE_CREDENTIALS_PATH` | API notifications | Optional until Firebase enabled | Path to service account JSON outside Git and outside mobile source. |
| `BYQUANT_API_URL` | Mobile | Yes for device builds | Gateway base URL consumed by React Native; mobile never talks to Bybit with private credentials. |

Optional advanced Python overrides `BYBIT_REST_BASE_URL` and `BYBIT_SPOT_WS_URL` are supported by code for controlled testing, but they are intentionally omitted from `.env.example` to avoid conflicts with `BYBIT_ENV`.

## Canonical signal contract

Python emits this webhook payload:

```json
{
  "signal_id": "uuid-or-stable-id",
  "symbol": "BTCUSDT",
  "direction": "BUY",
  "entry": 64000.1234,
  "stop_loss": 62000.0000,
  "tp1": 65000.0000,
  "tp2": 66000.0000,
  "tp3": 68000.0000,
  "timeframe": "1h",
  "candle_timestamp": 1787097600000
}
```

The API validates positive finite numeric values and ordering, then persists these database columns:

- `entry` -> `entry_price`
- `tp1` -> `take_profit_1`
- `tp2` -> `take_profit_2`
- `tp3` -> `take_profit_3`

`market_signals.signal_id` is unique and is the idempotency key. `GET /api/signals` returns `{ "data": MarketSignal[] }`; numeric PostgreSQL values are serialized as strings by the gateway, and the mobile client normalizes them to numbers for its TypeScript `Signal` model.

## PostgreSQL local setup

Docker Compose remains supported, but local development does not require Docker. Install PostgreSQL with your operating-system package manager, create an application database, initialize the checked-in schema, and point the API gateway at it with `DATABASE_URL`.

macOS/Homebrew example:

```bash
brew install postgresql@16
brew services start postgresql@16
createdb byquant_local
psql -d byquant_local -f database/schema.sql
export DATABASE_URL=postgresql://localhost/byquant_local
```

Debian/Ubuntu example:

```bash
sudo apt-get install postgresql postgresql-client
sudo -u postgres createdb byquant_local
sudo -u postgres psql -d byquant_local -f database/schema.sql
export DATABASE_URL=postgresql://postgres@localhost/byquant_local
```

The schema enables `pgcrypto`, creates `users`, `user_favorites`, and `market_signals`, and uses non-destructive `CREATE ... IF NOT EXISTS` statements. `market_signals.signal_id` is the unique idempotency key for webhook inserts, and `user_favorites(user_id, symbol)` prevents duplicate favorites.

Docker fallback when available:

```bash
docker compose up -d postgres
```

`docker-compose.yml` mounts `database/schema.sql` into `/docker-entrypoint-initdb.d/`, so a fresh volume initializes constraints and indexes. Existing volumes are not destructively reinitialized by Compose.

## API gateway startup

```bash
cd api-gateway
npm install
npm run build
node dist/server.js
```

Health check:

```bash
curl http://localhost:3000/health
```

Synthetic webhook test without real notification credentials should inject a test notifier in automated tests rather than call Telegram or Firebase.

## Python engine startup

```bash
cd backend-engine
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python main.py
```

The engine uses Bybit V5 Spot public endpoints, handles confirmed candles only, maintains a bounded chronological cache, validates configured symbols against active Spot instruments, deduplicates emitted signals, retries transient webhook failures, and reconnects WebSocket streams. It must never execute trades.

## Mobile app startup

```bash
cd mobile-app
npm install
npm run typecheck
```

Configure `BYQUANT_API_URL` for the host reachable from the simulator/device. The current mobile integration is REST-based and displays Latest Signals; it does not claim exchange-level real-time streaming.

## Testing

Safe tests do not require real Bybit, Telegram, Firebase, production PostgreSQL, or mobile devices.

```bash
cd backend-engine && pytest
cd api-gateway && npm test
cd mobile-app && npm run typecheck && npm test
```

The API tests use an in-memory database and mocked notifier for webhook, persistence, duplicate, and `GET /api/signals` behavior. The Python webhook dispatch test uses a fake HTTP session and verifies the auth header plus JSON payload shape.

## Security

- No trade execution behavior is implemented or allowed.
- Webhooks require `x-byquant-auth`.
- SQL uses parameterized queries.
- `signal_id` uniqueness prevents duplicate persistence and duplicate notifications for repeated webhooks.
- Request bodies are bounded to 64 KiB and malformed JSON receives safe errors.
- Telegram/Firebase failures are isolated from persistence.
- Mobile source must not contain Bybit secrets, middleware tokens, Telegram tokens, or Firebase private keys.

## Production readiness snapshot

| Component | Status | Reason |
| --- | --- | --- |
| Python engine | PARTIALLY READY | Unit tests cover strategy/cache/config/webhook shape; live Bybit connectivity not exercised here. |
| API gateway | PARTIALLY READY | Build/tests cover safe HTTP behavior with mocks; production deployment hardening remains environment-specific. |
| PostgreSQL | PARTIALLY READY | Schema initializes fresh DB and has constraints/indexes; migration/versioning workflow is still needed for production. |
| Telegram | PARTIALLY READY | Formatting and failure isolation are present; real delivery was not tested without explicit credentials. |
| Firebase | BLOCKED | Clean path is documented, but FCM OAuth/service-account implementation requires dependency/credential work before real delivery. |
| Mobile | PARTIALLY READY | REST contract, states, details, and favorites are implemented; no device smoke test was run. |
| End-to-end integration | PARTIALLY READY | Synthetic/mocked tests cover core contract; live external services and production DB were not tested. |

## Limitations

ByQuant is BUY-only, Spot-only, REST-based on mobile, and signal-generation-only. Signals are quantitative alerts, not financial advice, and they do not guarantee profitability.
