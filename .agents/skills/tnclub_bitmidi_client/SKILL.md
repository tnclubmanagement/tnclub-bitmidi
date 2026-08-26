---
name: tnclub-bitmidi-client
description: >-
  Hướng dẫn và mã mẫu tích hợp Client tìm kiếm & phát nhạc MIDI tĩnh (Static SQLite Database) không cần Backend, dễ dàng tái sử dụng cho mọi dự án Web/Frontend (React, Next.js, Vue, Svelte, Vanilla JS).
---

# Hướng Dẫn Tích Hợp Client: Static SQLite MIDI Database (Zero-Backend)

Tài liệu này cung cấp đặc tả giao thức, kiểu dữ liệu chuẩn và mã nguồn mẫu (Web Worker & Client SDK) để **bất kỳ ứng dụng nào** (như `tnclub-sightread`, web app, mobile hybrid) có thể kết nối, tìm kiếm toàn văn và phát nhạc MIDI trực tiếp từ cơ sở dữ liệu tĩnh `tracks.sqlite` mà không cần Backend.

---

## 1. Kiến Trúc Dữ Liệu Tĩnh (Data Architecture)

Toàn bộ kho dữ liệu MIDI (~17,256 bài hát) được lưu trữ trong **1 file cơ sở dữ liệu SQLite nén duy nhất** (`tracks.sqlite`), kết hợp với CDN lưu trữ file nhạc `.mid`:

```
[ Client App / Web Worker ]
       │
       ├──► 1. Tải Metadata ──────────► [CDN / Static Host] (/db/master_index.json)
       ├──► 2. Truy Vấn SQLite HTTP-VFS ─► [CDN / Static Host] (/db/tracks.sqlite via HTTP Range Requests)
       └──► 3. Stream File MIDI (.mid) ─► [Supabase Storage CDN] (/storage/v1/object/public/midi/...)
```

### 1.1 Danh Sách & Định Dạng Các File Tĩnh Tại `/db/`

| Tên File | Dung Lượng | Định Dạng | Mô Tả Chức Năng |
| :--- | :--- | :--- | :--- |
| `tracks.sqlite` | ~4.6 MB | SQLite | **File cơ sở dữ liệu duy nhất** chứa toàn bộ 17,256 bản ghi bài hát, có sẵn index `artist` và `title`. Được truy vấn trực tiếp từ xa qua HTTP Range Requests (206 Partial Content) bằng Web Worker `sql.js-httpvfs`. |
| `master_index.json` | ~170 B | JSON | File chỉ mục chứa metadata (tên file database, tổng số lượng bài hát, dung lượng file tính bằng bytes). |

#### Cấu Trúc File `master_index.json`
```json
[
  {
    "shard": "tracks.sqlite",
    "start_artist": "All Artists (A — Z)",
    "end_artist": "17,256 Tracks",
    "record_count": 17256,
    "size": 4681728
  }
]
```

#### Cấu Trúc Bảng SQLite Trong `tracks.sqlite`
```sql
CREATE TABLE tracks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    file_path TEXT NOT NULL,
    duration REAL NOT NULL DEFAULT 0
);
CREATE INDEX idx_artist ON tracks(artist);
CREATE INDEX idx_title ON tracks(title);
```

---

## 2. Kiểu Dữ Liệu Chuẩn (TypeScript Types)

Định nghĩa các interface độc lập, có thể copy trực tiếp vào bất kỳ dự án nào:

```typescript
/**
 * Bản ghi bài hát MIDI tiêu chuẩn
 */
export interface TrackRecord {
  /** Định danh duy nhất (UUID) */
  id: string;

  /** Tên bài hát */
  title: string;

  /** Tên nghệ sĩ / tác giả */
  artist: string;

  /**
   * Đường dẫn tương đối của file MIDI trong Bucket
   * Ví dụ: "clean_midi/\"Weird Al\" Yankovic/Amish Paradise.mid"
   */
  file_path: string;

  /** Thời lượng bài hát tính bằng giây */
  duration?: number;
}

/**
 * Cấu hình chỉ mục Database
 */
export interface MasterIndexEntry {
  shard: string;
  start_artist: string;
  end_artist: string;
  record_count: number;
  size?: number;
}
```

---

## 3. Quy Tắc CDN & Supabase Storage

### 3.1 Cấu Hình CDN Storage

Các file nhị phân `.mid` được host trên Public Bucket của Supabase Storage:
- **Base Bucket URL:** `https://oczfmoquiugfdksddwuf.supabase.co/storage/v1/object/public/midi`
- **Biến môi trường gợi ý:** `NEXT_PUBLIC_MIDI_BASE_URL` hoặc `VITE_MIDI_BASE_URL`

### 3.2 Hàm Chuẩn Hóa Đường Dẫn `getMidiUrl` (`midiUtils.ts`)

File nhạc có thể chứa các ký tự đặc biệt (dấu ngoặc kép `"`, khoảng trắng, ký tự `#`, `?`, `%`). Hàm `getMidiUrl` đảm bảo encode an toàn từng segment đường dẫn:

```typescript
export const DEFAULT_MIDI_STORAGE_URL =
  "https://oczfmoquiugfdksddwuf.supabase.co/storage/v1/object/public/midi";

/**
 * Sinh URL CDN hoàn chỉnh đến file MIDI
 * @param filePath Đường dẫn tương đối (e.g. "\"Weird Al\" Yankovic/Eat It.mid")
 * @param baseUrl (Tùy chọn) Override CDN base URL
 */
export function getMidiUrl(
  filePath: string,
  baseUrl: string = DEFAULT_MIDI_STORAGE_URL
): string {
  if (!filePath) return "";

  // 1. Chuẩn hóa & loại bỏ các tiền tố thư mục thừa, loại bỏ dấu ngoặc kép
  const cleanPath = filePath
    .replace(/^.*\/clean_midi\//, "")
    .replace(/\\/g, "/")
    .replace(/"/g, "")
    .replace(/^\/+/, "");

  // 2. Encode từng thành phần đường dẫn để không làm hỏng cấu trúc dấu '/'
  const encodedPath = cleanPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
  return `${cleanBaseUrl}/${encodedPath}`;
}

/**
 * Tải ArrayBuffer của file MIDI từ CDN để phát nhạc (Soundfont / Web Audio API)
 */
export async function fetchMidiBuffer(filePath: string, baseUrl?: string): Promise<ArrayBuffer> {
  const url = getMidiUrl(filePath, baseUrl);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load MIDI file: HTTP ${response.status} (${url})`);
  }
  return await response.arrayBuffer();
}
```

---

## 4. Code Tích Hợp SQLite Web Worker (`sql.js-httpvfs`)

Sử dụng thư viện `sql.js-httpvfs` để truy vấn trực tiếp file `tracks.sqlite` trên server tĩnh thông qua HTTP Range Requests (chỉ tải các block 4KB cần thiết khi truy vấn, không phải tải toàn bộ file 4.6MB về RAM).

### 4.1 Cài Đặt Dependency
```bash
npm install sql.js-httpvfs
```

> **Lưu ý:** Đảm bảo copy 2 file WASM/Worker của `sql.js-httpvfs` vào thư mục public của dự án (`/public/sql.js-httpvfs/sqlite.worker.js` và `/public/sql.js-httpvfs/sql-wasm.wasm`).

### 4.2 Service Quản Lý Truy Vấn: `midiSqlWorker.ts`

```typescript
import { createDbWorker, WorkerHttpvfs } from "sql.js-httpvfs";
import { TrackRecord, MasterIndexEntry } from "./types";

export interface MidiWorkerConfig {
  /** Base URL chứa thư mục /db (Mặc định: window.location.origin) */
  basePath?: string;
  /** Tên file database (Mặc định: "tracks.sqlite") */
  dbFileName?: string;
}

/**
 * Khởi tạo SQLite Web Worker kết nối tới file tracks.sqlite
 */
export async function createMidiWorker(config: MidiWorkerConfig = {}): Promise<WorkerHttpvfs> {
  const basePath = config.basePath || "";
  const dbFileName = config.dbFileName || "tracks.sqlite";

  const workerUrl = new URL(`${basePath}/sql.js-httpvfs/sqlite.worker.js`, window.location.origin).toString();
  const wasmUrl = new URL(`${basePath}/sql.js-httpvfs/sql-wasm.wasm`, window.location.origin).toString();
  const dbUrl = new URL(`${basePath}/db/${dbFileName}`, window.location.origin).toString();

  // Tải metadata kích thước file từ master_index.json để tối ưu HTTP Range requests
  let fileLength = 4681728; // Default fallback size (~4.6MB)
  try {
    const res = await fetch(new URL(`${basePath}/db/master_index.json`, window.location.origin).toString());
    if (res.ok) {
      const data: MasterIndexEntry[] = await res.json();
      if (data[0]?.size) fileLength = data[0].size;
    }
  } catch (err) {
    console.warn("Could not fetch master_index.json, using default size", err);
  }

  const worker = await createDbWorker(
    [
      {
        from: "inline",
        config: {
          serverMode: "full",
          url: dbUrl,
          requestChunkSize: 4096,
          fileLength,
        },
      },
    ],
    workerUrl,
    wasmUrl
  );

  return worker;
}

/**
 * Tìm kiếm bài hát toàn văn (Full-Text Search) bằng câu lệnh SQL
 *
 * @param worker Đối tượng WorkerHttpvfs đã khởi tạo
 * @param query Từ khóa tìm kiếm (theo tên bài hát hoặc ca sĩ)
 * @param limit Số lượng kết quả tối đa cần lấy
 * @returns Danh sách bài hát khớp với từ khóa
 */
export async function searchTracks(
  worker: WorkerHttpvfs,
  query: string = "",
  limit: number = 500
): Promise<TrackRecord[]> {
  let sql = "SELECT id, title, artist, file_path FROM tracks";
  const trimmed = query.trim();

  if (trimmed.length > 0) {
    const safeQuery = trimmed.replace(/'/g, "''");
    sql += ` WHERE title LIKE '%${safeQuery}%' OR artist LIKE '%${safeQuery}%'`;
  }

  sql += ` ORDER BY artist ASC, title ASC LIMIT ${limit};`;

  const result = await worker.db.query(sql);
  return result as unknown as TrackRecord[];
}
```

---

## 5. Ví Dụ Tích Hợp Vào UI (React / Next.js / Vue)

Ví dụ component tìm kiếm và phát nhạc MIDI hoàn chỉnh:

```tsx
import React, { useEffect, useState, useRef } from "react";
import { WorkerHttpvfs } from "sql.js-httpvfs";
import { createMidiWorker, searchTracks } from "./midiSqlWorker";
import { TrackRecord } from "./types";
import { getMidiUrl, fetchMidiBuffer } from "./midiUtils";

export function MidiSearchAndPlayer() {
  const workerRef = useRef<WorkerHttpvfs | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 1. Khởi tạo Web Worker khi mount component
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        setLoading(true);
        const worker = await createMidiWorker();
        if (!isMounted) return;
        workerRef.current = worker;

        // Tải danh sách mặc định ban đầu
        const initialTracks = await searchTracks(worker, "", 50);
        if (isMounted) setTracks(initialTracks);
      } catch (err) {
        console.error("Lỗi khởi tạo MIDI SQLite Worker:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    init();

    return () => {
      isMounted = false;
      // sql.js-httpvfs worker sẽ tự giải phóng khi context bị hủy
    };
  }, []);

  // 2. Xử lý tìm kiếm
  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!workerRef.current) return;

    try {
      const results = await searchTracks(workerRef.current, text, 100);
      setTracks(results);
    } catch (err) {
      console.error("Lỗi truy vấn:", err);
    }
  };

  // 3. Xử lý phát / tải nhạc
  const handlePlay = async (track: TrackRecord) => {
    console.log("Đang tải MIDI:", track.title);
    const buffer = await fetchMidiBuffer(track.file_path);
    // Truyền buffer vào Soundfont / Midi Player (e.g. Tone.js, soundfont-player, spessasynth)
    console.log("Đã tải xong buffer kích thước:", buffer.byteLength);
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: 800, margin: "0 auto" }}>
      <h2>TNClub MIDI Search</h2>

      <input
        type="text"
        placeholder="Tìm tên bài hát hoặc ca sĩ (e.g. Queen, Michael Jackson, Canon...)"
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        style={{ width: "100%", padding: "10px", fontSize: "16px", marginBottom: "1rem" }}
      />

      {loading ? (
        <p>Đang kết nối SQLite Database...</p>
      ) : (
        <div>
          <p>Tìm thấy {tracks.length} bài hát:</p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {tracks.map((track) => (
              <li
                key={track.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px",
                  borderBottom: "1px solid #eee",
                  alignItems: "center"
                }}
              >
                <div>
                  <strong>{track.artist}</strong> — {track.title}
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => handlePlay(track)}>Phát</button>
                  <a
                    href={getMidiUrl(track.file_path)}
                    download={`${track.artist} - ${track.title}.mid`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Tải .mid
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

---

## 6. Checklist Tích Hợp Nhanh
- [x] Đã copy `tracks.sqlite` và `master_index.json` vào thư mục `/public/db/`.
- [x] Đã copy `sqlite.worker.js` và `sql-wasm.wasm` vào thư mục `/public/sql.js-httpvfs/`.
- [x] Sử dụng `getMidiUrl(track.file_path)` để tải file `.mid` từ CDN Supabase Storage.
