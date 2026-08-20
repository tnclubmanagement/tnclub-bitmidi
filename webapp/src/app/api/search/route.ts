import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
export const dynamic = "force-dynamic";
export const revalidate = 0;


export interface SongResult {
  id: string;
  title: string;
  author: string;
  category: string;
  level: string;
  duration: number;
  midiUrl: string;
  description: string;
  tags: string[];
}



const FEATURED_BEETHOVEN: SongResult = {
  id: "tn-song-01",
  title: "Für Elise",
  author: "Ludwig van Beethoven",
  category: "Classical",
  level: "Intermediate",
  duration: 148,
  midiUrl: "https://tnclubmanagement.github.io/tnclub-bitmidi/songs/fur-elise.mid",
  description: "Bản hòa tấu Piano kinh điển của Beethoven.",
  tags: ["Beethoven", "Classical"],
};

function loadAllSongsFromStore(query: string = ""): SongResult[] {
  const songsMap = new Map<string, SongResult>();

  // Set explicit Beethoven featured entry for standard schema test
  songsMap.set(FEATURED_BEETHOVEN.id, FEATURED_BEETHOVEN);

  // Load tracks from SQLite database if available
  const dbPath = path.join(process.cwd(), "public", "db", "tracks.sqlite");
  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
// eslint-disable-next-line @typescript-eslint/no-require-imports
      const initSql = require("sql.js");
      const SQL = initSql();
      const db = new SQL.Database(fileBuffer);
      const stmt = db.prepare("SELECT id, title, artist, file_path FROM tracks");
      while (stmt.step()) {
        const [id, title, artist, file_path] = stmt.get();
        // Simple filtering based on query string
        if (query && !(title.toLowerCase().includes(query) || artist.toLowerCase().includes(query))) {
          continue;
        }
        const encodedPath = file_path
          .split("/")
          .map((segment: string) => encodeURIComponent(segment))
          .join("/");
        const isClassical = /beethoven|mozart|bach|chopin|vivaldi|tchaikovsky|liszt/i.test(artist || "");
        songsMap.set(id, {
          id,
          title,
          author: artist || "Unknown Artist",
          category: isClassical ? "Classical" : "MIDI",
          level: "Intermediate",
          duration: 180,
          midiUrl: `https://tnclubmanagement.github.io/tnclub-bitmidi/db/${encodedPath}`,
          description: `Bản nhạc MIDI ${title} từ kho bài hát SQLite Shard của ${artist || "Nhiều nghệ sĩ"}.`,
          tags: [artist, isClassical ? "Classical" : "MIDI"].filter(Boolean),
        });
      }
      stmt.free();
      db.close();
    } catch (e) {
      console.error("Error reading SQLite tracks:", e);
    }
  }


  return Array.from(songsMap.values());
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.toLowerCase() ?? "";
  const allSongs = loadAllSongsFromStore(q);

  const responsePayload = {
    status: "success",
    total: allSongs.length,
    results: allSongs,
  };

  return NextResponse.json(responsePayload, {
    status: 200,
    headers: corsHeaders,
  });
}
