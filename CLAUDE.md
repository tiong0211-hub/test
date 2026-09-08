# Plant Engineer Daily Insight

Daily Instagram card generator. One topic per day, explained for a plant-engineering
audience, with a cross-discipline analogy back to plant engineering.

**Email sending is discontinued** (`scripts/send-email.js`, `templates/newsletter-template.html`,
`data/drafts/`) — kept for reference only, do not run. Instagram is now the only channel.

## Daily pipeline

1. `node scripts/build-instagram-post.js` — picks today's topic (reuses the existing
   14-day no-repeat rotation in `data/history.json` via `select-topic.js`) and assigns
   the next Instagram VOL number (`data/instagram-history.json`, independent of the old
   email VOL count — restarted at 001 on 2026-09-09). Prints `{vol, volPadded, category,
   topicId, title, hint, date}` and appends the entry.
2. Using `title`/`hint`, write (in English only — the image targets a broader audience
   than the Korean-only earlier version):
   - `TITLE` (h1, `<br>` where a manual line break helps)
   - `LEAD` (1–3 sentences explaining the concept)
   - `CHART_TITLE` + `DIAGRAM_HTML` — a small inline-SVG/HTML diagram made fresh for
     *this* topic's structure (a flow, a curve, a comparison — whatever fits; it does
     not have to be the box-and-arrow layout used for the bullwhip effect). Use the
     card's own tokens: ink `#1c2b3a`, accent `#b3762c` / `#c9791f`, muted label
     `#4a5568`/`#8a7a5c`, card bg `#faf6ee`, card border `#e6ddc8`. It renders inside
     `.chart-box` at 100% width — see `templates/instagram-post-template.html` for the
     exact slot and `output/instagram/2026-09-09/content.json` for a full worked
     example.
   - `BADGE` (category, uppercase English), `CTA` (short, e.g. "Full story → link in bio")
3. `node scripts/render-instagram-image.js --content=<path.json> --out=<path.png>` —
   renders the 1080×1350 PNG via Playwright/Chromium (`/opt/pw-browsers/chromium`).
4. Write a caption combining an English version and a Korean translation in one text
   block (English first, then `---`, then Korean) — see
   `output/instagram/2026-09-09/caption.txt` for the format used so far.
5. Save `content.json`, the rendered PNG, and `caption.txt` under
   `output/instagram/<date>/`, then commit.
6. Push the PNG to the user as a downloadable file (`display: "attach"`) and the
   caption as chat text. Posting to Instagram itself is manual (no API integration is
   set up) — the user copies the caption and uploads the image themselves.

## Conventions

- Card visual system: cream ground `#eef0ea`, card `#fffdf9`, border `#e6e0d2`,
  ink `#1c2b3a`, gold accent `#b3762c`/`#a9793a`. Keep VOL/masthead/footer chrome as-is;
  only `BADGE`/`TITLE`/`LEAD`/`CHART_TITLE`/`DIAGRAM_HTML`/`CTA` change day to day.
- `data/history.json` still drives topic dedup for both the (defunct) email history and
  Instagram; don't stop writing to it.
