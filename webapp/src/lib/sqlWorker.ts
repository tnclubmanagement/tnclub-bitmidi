import { createDbWorker, WorkerHttpvfs } from "sql.js-httpvfs";

export interface TrackRecord {
  id: string;
  title: string;
  artist: string;
  file_path: string;
  duration?: number;
  instruments?: string;
  primary_instrument?: string;
  tracks_count?: number;
  has_drums?: boolean | number;
}

export interface MasterIndexEntry {
  shard: string;
  start_artist: string;
  end_artist: string;
  record_count: number;
  size?: number;
}

export async function createShardWorker(shardFileName: string, fileLength?: number): Promise<WorkerHttpvfs> {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const workerUrl = new URL(`${basePath}/sql.js-httpvfs/sqlite.worker.js`, window.location.origin).toString();
  const wasmUrl = new URL(`${basePath}/sql.js-httpvfs/sql-wasm.wasm`, window.location.origin).toString();
  const dbUrl = new URL(`${basePath}/db/${shardFileName}`, window.location.origin).toString();

  const inlineConfig: { serverMode: "full"; url: string; requestChunkSize: number; fileLength?: number } = {
    serverMode: "full",
    url: dbUrl,
    requestChunkSize: 4096,
  };

  if (typeof fileLength === "number" && fileLength > 0) {
    inlineConfig.fileLength = fileLength;
  }

  const worker = await createDbWorker(
    [
      {
        from: "inline",
        config: inlineConfig,
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

export async function fetchTracksFromShard(
  worker: WorkerHttpvfs,
  query: string = "",
  instrumentFilter: string = "ALL"
): Promise<TrackRecord[]> {
  let sql = "SELECT id, title, artist, file_path, duration, instruments, primary_instrument, tracks_count, has_drums FROM tracks";
  const conditions: string[] = [];

  if (query.trim().length > 0) {
    const q = query.replace(/'/g, "''");
    conditions.push(`(title LIKE '%${q}%' OR artist LIKE '%${q}%')`);
  }

  if (instrumentFilter && instrumentFilter !== "ALL") {
    if (instrumentFilter === "drums") {
      conditions.push("has_drums = 1");
    } else {
      const inst = instrumentFilter.toLowerCase().replace(/'/g, "''");
      conditions.push(`(LOWER(primary_instrument) LIKE '%${inst}%' OR LOWER(instruments) LIKE '%"${inst}"%')`);
    }
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(" AND ")}`;
  }

  sql += " ORDER BY artist ASC, title ASC LIMIT 20000;";

  const result = await worker.db.query(sql);
  return result as unknown as TrackRecord[];
}
