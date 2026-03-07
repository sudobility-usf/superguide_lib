# @sudobility/superguide_lib

Business logic library with Zustand stores for the Superguide application.

## Installation

```bash
bun add @sudobility/superguide_lib
```

Peer dependencies: `react` (>=18), `@tanstack/react-query` (>=5), `zustand` (>=5), `@sudobility/types`.

## Usage

```ts
import { useHistoriesManager } from "@sudobility/superguide_lib";

const {
  histories,
  total,
  percentage,
  isCached,
  createHistory,
  updateHistory,
  deleteHistory,
} = useHistoriesManager({
  baseUrl: "http://localhost:8022",
  networkClient,
  userId,
  token,
  autoFetch: true,
});
```

## API

### useHistoriesManager

Unified hook combining superguide_client hooks + Zustand store + business logic:

- Percentage calculation: `(userSum / globalTotal) * 100`
- Cache fallback when server hasn't responded yet
- Auto-fetch on mount (configurable)
- Token reactivity: resets state on token change

### useHistoriesStore

Zustand store providing per-user client-side cache with `set`, `get`, `add`, `update`, `remove` operations.

## Development

```bash
bun run build          # Build ESM
bun test               # Run Vitest tests
bun run typecheck      # TypeScript check
bun run lint           # ESLint
bun run verify         # All checks + build (use before commit)
```

## Related Packages

- **superguide_types** -- Shared type definitions
- **superguide_client** -- API client SDK (wrapped by this library)
- **superguide_api** -- Backend server
- **superguide_app** -- Web frontend (consumes useHistoriesManager)
- **superguide_app_rn** -- React Native app (consumes useHistoriesManager)

## License

BUSL-1.1
