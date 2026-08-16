Act as a Senior Frontend Architect. I am building a highly optimized, local-first Next.js (Static Export) application to browse a massive MIDI database using `sql.js-httpvfs` (HTTP Range Requests).

### Data Context & Smart Sharding Strategy
The backend pipeline has processed the data into balanced SQLite shards to prevent data skew. The static files are located in `/public/db/`:
1. `master_index.json`: A lightweight directory index. Format: `[{"shard": "shard_001.sqlite", "start_artist": "Aaliyah", "end_artist": "Avicii"}, ...]`
2. Shards: `shard_001.sqlite`, `shard_002.sqlite`, etc.
3. MIDI files: Located in `/public/midi/`.

### Architectural Strict Rules (CRITICAL)
1. NO INLINE STYLES. Use standard CSS Modules or Ant Design's theme tokens. I am strictly against AI-generated cluttered code.
2. DOM Performance: You MUST use `react-virtuoso` wrapping the Ant Design `<Table>` component to handle the thousands of rows per shard without reflow/repaint bottlenecks.
3. Completely Static: Absolutely no Next.js API routes (`/pages/api`). All fetching must be done on the client side against static files.

### Core Features to Implement
1. **Master Index Navigator:** On initial load, fetch `master_index.json`. Render an Ant Design UI component (e.g., a Sidebar Menu, Select, or segmented control) displaying the artist ranges (e.g., "Aaliyah - Avicii").
2. **Dynamic Worker Router:** When the user selects a range, the app dynamically mounts the corresponding `shard_XXX.sqlite` file into a Web Worker using `sql.js-httpvfs`. Ensure the old worker connection is properly closed/cleaned up before mounting a new one.
3. **Virtualized Data Table:** Display `Title` and `Artist`. Upon successful shard mount, trigger a `SELECT * FROM tracks` query and feed the results into the virtual table.
4. **Player Component:** A sticky footer containing `<html-midi-player>`. Clicking a row dynamically passes the `file_path` to the player.

### Your Task
Provide the step-by-step implementation:
1. The exact folder structure for this Next.js app.
2. The logic for the Web Worker setup (`worker.ts`) handling `sql.js-httpvfs`. Pay explicit attention to the static path resolution (`url` to the worker and wasm files) to ensure it does not return 404s after `next build && next export`.
3. The main Page component integrating the Index Navigator, the Dynamic Worker Caller, and the Virtualized Table.