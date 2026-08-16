Act as a Rust Systems Engineer. We are building a static-first data pipeline. I have the "clean_midi" dataset with the folder structure: `/clean_midi/[Artist]/[Title].mid`.

Alphabetical (A-Z) sharding is too naive and causes severe data skew. I need a SMARTER sharding strategy to ensure absolute performance optimization and balanced storage.

### Smart Sharding Strategy: Balanced Chunks with a Global Index
1. Traverse the directory and collect all metadata (Artist, Title, File_path).
2. Sort the entire collection alphabetically by `Artist`, then by `Title`.
3. Partition the dataset into perfectly balanced SQLite shards, strictly capped at `MAX_RECORDS_PER_SHARD` (e.g., 5,000 records). Name them `shard_001.sqlite`, `shard_002.sqlite`, etc.
4. Concurrently, generate a lightweight `master_index.json`. This file acts as a B-Tree like directory for the frontend. It must contain an array of objects indicating the alphabetical range of each shard. 
   Example format: `[{"shard": "shard_001.sqlite", "start_artist": "Aaliyah", "end_artist": "Avicii"}, ...]`

### SQLite Schema per Shard
```sql
CREATE TABLE tracks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    file_path TEXT NOT NULL
);
CREATE INDEX idx_artist ON tracks(artist);
CREATE INDEX idx_title ON tracks(title);