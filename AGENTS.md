# ByQuant Agent Instructions

- Keep ByQuant focused on spot-market signal generation; do not add derivatives or leveraged trading behavior.
- Never commit real secrets, API keys, credentials, tokens, or private Firebase material.
- Keep environment-specific values in `.env`; update `.env.example` when adding required configuration.
- Use strict TypeScript in `api-gateway` and Python type hints in `backend-engine`.
- Prefer bounded in-memory data structures for market data.
- Add or update automated tests for behavior that affects signals, API validation, persistence, or notifications.
