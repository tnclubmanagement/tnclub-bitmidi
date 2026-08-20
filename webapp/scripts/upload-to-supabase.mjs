import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL || process.argv[2];
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.argv[3];
const BUCKET_NAME = process.env.BUCKET_NAME || process.argv[4] || "midi";

const MIDI_DIR = path.resolve(__dirname, "../public/midi");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("\n❌ LỖI: Thiếu thông tin Supabase URL hoặc API Key!");
  console.log("\n👉 HƯỚNG DẪN CÁCH CHẠY:");
  console.log(`   node scripts/upload-to-supabase.mjs <SUPABASE_URL> <SUPABASE_KEY> [BUCKET_NAME]\n`);
  process.exit(1);
}

function getAllFiles(dirPath, arrayOfFiles = [], baseDir = dirPath) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles, baseDir);
    } else {
      if (file.toLowerCase().endsWith(".mid") || file.toLowerCase().endsWith(".midi")) {
        const relativePath = path.relative(baseDir, fullPath);
        arrayOfFiles.push({ fullPath, relativePath });
      }
    }
  });

  return arrayOfFiles;
}

async function uploadFile(fileObj) {
  const { fullPath, relativePath } = fileObj;
  
  // Sanitize path: remove ", #, ?, % which are invalid in Supabase/S3 object keys
  const sanitizedPath = relativePath
    .replace(/"/g, "")
    .replace(/#/g, "")
    .replace(/\?/g, "")
    .replace(/%/g, "");

  // Encode each segment of the path
  const normalizedRelativePath = sanitizedPath.split(path.sep).map(encodeURIComponent).join("/");
  const uploadUrl = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/${BUCKET_NAME}/${normalizedRelativePath}`;

  const fileData = fs.readFileSync(fullPath);

  try {
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "apiKey": SUPABASE_KEY,
        "x-upsert": "true",
        "Content-Type": "audio/midi",
      },
      body: fileData,
    });

    if (res.ok) {
      return { success: true };
    } else {
      const errText = await res.text();
      return { success: false, error: errText };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log(`🔍 Đang quét toàn bộ file MIDI trong: ${MIDI_DIR} ...`);
  if (!fs.existsSync(MIDI_DIR)) {
    console.error(`❌ Thư mục ${MIDI_DIR} không tồn tại!`);
    process.exit(1);
  }

  let allFiles = getAllFiles(MIDI_DIR);
  if (process.argv.includes("--only-special")) {
    allFiles = allFiles.filter((f) => /[#?"]/.test(f.relativePath));
    console.log(`🎯 Chế độ [only-special]: Lọc ra ${allFiles.length} file bị dính ký tự đặc biệt (#, ?, ").`);
  } else {
    console.log(`✅ Tìm thấy tổng cộng ${allFiles.length} file MIDI.\n`);
  }

  let successCount = 0;
  let failCount = 0;
  const CONCURRENCY = 5;

  for (let i = 0; i < allFiles.length; i += CONCURRENCY) {
    const chunk = allFiles.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (fileObj) => {
        const res = await uploadFile(fileObj);
        if (res.success) {
          successCount++;
          console.log(`[${successCount + failCount}/${allFiles.length}] 🟢 OK: ${fileObj.relativePath}`);
        } else {
          failCount++;
          console.error(`[${successCount + failCount}/${allFiles.length}] 🔴 FAIL (${fileObj.relativePath}):`, res.error);
        }
      })
    );
  }

  console.log(`\n🎉 HOÀN THÀNH UPLOAD!`);
  console.log(`  - Thành công: ${successCount}`);
  console.log(`  - Thất bại: ${failCount}`);
}

main();
