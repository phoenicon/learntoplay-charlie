// LearnToPlay proxy — the ONLY thing that holds the API key.
// Browser → this server → Anthropic. Zero npm dependencies: `node server.js`.
// Requires Node 18+ (uses built-in fetch). Charlie's M4 Mac is fine.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC = join(__dirname, "public");
const PORT = process.env.PORT || 8787;
const MODEL = process.env.LTP_MODEL || "claude-sonnet-5"; // swap for claude-opus-4-8 if you want max quality
const KEY = process.env.ANTHROPIC_API_KEY;

// --- load .env (tiny parser, so there's nothing to install) ---
try {
  const env = await readFile(join(__dirname, ".env"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* no .env file — that's fine, env vars may be set another way */ }

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon",
};

// --- wallet guard: stop a shared URL (or a bot) from running up the API bill ---
// Tune via .env: LTP_PER_MIN (per-IP burst), LTP_DAILY_CAP (whole-app requests/day).
const PER_MIN = +(process.env.LTP_PER_MIN || 15);
const DAILY_CAP = +(process.env.LTP_DAILY_CAP || 800);
const hits = new Map();           // ip -> [timestamps]
let day = { key: "", count: 0 };  // rolls over each calendar day
function guard(ip, now) {
  const dayKey = new Date(now).toISOString().slice(0, 10);
  if (day.key !== dayKey) day = { key: dayKey, count: 0 };
  if (day.count >= DAILY_CAP) return "The app has hit today's shared usage limit. Try again tomorrow.";
  const arr = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (arr.length >= PER_MIN) return "You're going a bit fast — give it a few seconds and try again.";
  arr.push(now); hits.set(ip, arr); day.count++;
  return null;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ""; req.on("data", c => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on("end", () => resolve(data)); req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  // ---- API proxy ----
  if (req.method === "POST" && req.url === "/api/chat") {
    const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "?";
    const blocked = guard(ip, Date.now());
    if (blocked) {
      res.writeHead(429, { "content-type": "application/json" });
      return res.end(JSON.stringify({ error: blocked }));
    }
    const key = process.env.ANTHROPIC_API_KEY || KEY;
    if (!key) {
      res.writeHead(500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ error: "ANTHROPIC_API_KEY not set. Add it to learntoplay/.env" }));
    }
    try {
      const { messages, system, max_tokens } = JSON.parse(await readBody(req) || "{}");
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.LTP_MODEL || MODEL,
          max_tokens: max_tokens || 1000,
          system, messages,
        }),
      });
      const text = await upstream.text();
      res.writeHead(upstream.status, { "content-type": "application/json" });
      return res.end(text);
    } catch (e) {
      res.writeHead(500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ error: String(e) }));
    }
  }

  // ---- static files ----
  let path = decodeURIComponent((req.url || "/").split("?")[0]);
  if (path === "/") path = "/index.html";
  const full = normalize(join(PUBLIC, path));
  if (!full.startsWith(PUBLIC)) { res.writeHead(403); return res.end("forbidden"); }
  try {
    const file = await readFile(full);
    res.writeHead(200, { "content-type": MIME[extname(full)] || "application/octet-stream" });
    res.end(file);
  } catch {
    res.writeHead(404); res.end("not found");
  }
});

server.listen(PORT, () => {
  console.log(`\n  LearnToPlay → http://localhost:${PORT}`);
  console.log(`  model: ${process.env.LTP_MODEL || MODEL}`);
  console.log(`  api key: ${(process.env.ANTHROPIC_API_KEY || KEY) ? "loaded ✓" : "MISSING — add it to .env"}\n`);
});
