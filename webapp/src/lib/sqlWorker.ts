import { createDbWorker, WorkerHttpvfs } from "sql.js-httpvfs";

export interface TrackRecord {
  id: string;
  title: string;
  artist: string;
  file_path: string;
}

export interface MasterIndexEntry {
  shard: string;
  start_artist: string;
  end_artist: string;
  record_count: number;
}

export async function createShardWorker(shardFileName: string): Promise<WorkerHttpvfs> {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const workerUrl = new URL(`${basePath}/sql.js-httpvfs/sqlite.worker.js`, window.location.origin).toString();
  const wasmUrl = new URL(`${basePath}/sql.js-httpvfs/sql-wasm.wasm`, window.location.origin).toString();
  const dbUrl = new URL(`${basePath}/db/${shardFileName}`, window.location.origin).toString();

  const worker = await createDbWorker(
    [
      {
        from: "inline",
        config: {
          serverMode: "full",
          url: dbUrl,
          requestChunkSize: 4096,
        },
      },
    ],
    workerUrl,
    wasmUrl
  );

  return worker;
}

export async function checkRangeSupport(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-100" },
    });
    return res.status === 206;
  } catch (err) {
    console.warn("Range check failed:", err);
    return false;
  }
}

export async function fetchTracksFromShard(worker: WorkerHttpvfs, query: string = ""): Promise<TrackRecord[]> {
  let sql = "SELECT id, title, artist, file_path FROM tracks";
  if (query.trim().length > 0) {
    sql += ` WHERE title LIKE '%${query.replace(/'/g, "''")}%' OR artist LIKE '%${query.replace(/'/g, "''")}%'`;
  }
  sql += " ORDER BY artist ASC, title ASC LIMIT 20000;";

  const result = await worker.db.query(sql);
  return result as unknown as TrackRecord[];
}
