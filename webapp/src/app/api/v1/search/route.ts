import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-static";

export interface MasterIndexEntry {
  shard: string;
  start_artist: string;
  end_artist: string;
  record_count: number;
}

export async function GET() {
  try {
    const indexPath = path.join(process.cwd(), "public", "db", "master_index.json");
    if (!fs.existsSync(indexPath)) {
      return NextResponse.json({ success: false, error: "Master index file not found" }, { status: 500 });
    }

    const indexContent = fs.readFileSync(indexPath, "utf-8");
    const masterIndex: MasterIndexEntry[] = JSON.parse(indexContent);

    return NextResponse.json({
      success: true,
      total_shards: masterIndex.length,
      shards: masterIndex.map((entry) => ({
        ...entry,
        sqlite_url: `/db/${entry.shard}`,
      })),
      architecture: "Client-Side Zero-Server SQLite HTTP Range Queries",
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
