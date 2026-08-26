# LearnToPlay — Charlie's Geography study OS

An AI study companion for BSc Geography, Year 2, Kingston. One self-contained web app:
a tutor that holds a thread, "Explain It" through six lenses, quiz-me-and-mark-me,
an essay coach that won't write it for you, a notes→revision-pack builder, and three
drag-the-slider labs (storm hydrograph, carbon/climate timeline, sea-level cross-section).

The labs run with no internet. The AI features talk to a tiny local proxy (`server.js`)
that holds the API key — the key never touches the browser.

## Run it (2 minutes)

1. Get an API key from https://console.anthropic.com → API Keys.
2. In this folder, make your `.env`:
   ```bash
   cp .env.example .env
   ```
   then open `.env` and paste your key after `ANTHROPIC_API_KEY=`.
3. Start it:
   ```bash
   npm start        # or:  node server.js
   ```
4. Open http://localhost:8787 — every panel now works.

No `npm install` needed: the server uses only built-in Node (v18+). Charlie's Mac is fine.

## Put it in front of Charlie (from anywhere)

### Render (you already know this one)
- New → Web Service → point at this repo/folder.
- Build command: *(leave blank)* · Start command: `node server.js`
- Add an Environment Variable `ANTHROPIC_API_KEY` = your key. **Do not** upload `.env`.
- Deploy. Charlie hits the Render URL from campus; the key stays server-side.

Cloudflare Workers / Vercel work the same way — same proxy idea, different wrapper.

## Make it *his*

- **Real modules:** edit the `MODULES` array near the top of the `<script>` in
  `public/index.html` — swap my placeholders for Kingston's actual Year 2 modules,
  weightings and deadlines. (Paste Colin the real list and it's a five-minute change,
  or lift them into a `config.json` so Charlie edits data without touching code.)
- **The tutor's voice / examples:** the `GEO_SYS` prompt string in the same script.
- **Default model:** `LTP_MODEL` in `.env` (Sonnet for value, Opus for essay coaching).

## What's real vs. roadmap
- **Live:** AI Tutor, Explain It, Quiz Me, Essay Coach, Research Assistant, 3 Labs.
- **Roadmap (honestly labelled in-app):** GIS Lab, Field Companion, Play Mode.
- **Next real unlock:** per-device progress (localStorage now that it's served from a
  real origin), then adaptive memory (RAG over Charlie's own notes) — but only *after*
  he's used it enough to generate data worth remembering.
