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
   `output/instagram/<date>[-vol<NNN>]/` (append `-vol<NNN>` if that date's folder is
   already taken — e.g. a manual run and the automated run land on the same calendar
   day), then `git add`/`commit`/push to the current branch. Do not skip the push —
   an unpushed run has produced nothing.
6. Push the PNG to the user as a downloadable file (`display: "attach"`) and the
   caption as chat text.
7. **Ask for approval before publishing — never publish without it.** Once
   `IG_BUSINESS_ACCOUNT_ID` is configured (see "Instagram auto-publish setup" below),
   ask in chat: "게시할까요?" and end the turn. Only when the user replies approving
   (in this same session — it can be a later message, the session does not need to
   stay open) do you run:
   ```
   node scripts/publish-instagram.js \
     --image-url=https://raw.githubusercontent.com/tiong0211-hub/test/<branch>/output/instagram/<date-folder>/post-en.png \
     --caption-file=output/instagram/<date-folder>/caption.txt \
     --ig-user-id=$IG_BUSINESS_ACCOUNT_ID
   ```
   (the repo is public, so the raw.githubusercontent.com URL is reachable by Meta's
   servers once pushed — publish only after the push in step 5 has landed). If
   `IG_BUSINESS_ACCOUNT_ID` isn't set yet, auto-publish isn't wired up — skip step 7
   entirely and stop after step 6 as before (manual posting).
   Report the result (success + the returned post id, or the error) back in chat.

## Instagram auto-publish setup

Auto-publishing goes through the Instagram Graph API and needs one-time setup the user
does outside this session (converting the account to Professional, linking a Facebook
Page, creating a Meta app, generating a long-lived access token — see chat history for
the full walkthrough) plus:
- The long-lived access token registered as a Claude Code cloud environment **API
  credential**: Allowed website `graph.facebook.com`, Bearer token. The token is never
  visible to this session or in code — `scripts/publish-instagram.js` relies on the
  agent proxy to attach it.
- `IG_BUSINESS_ACCOUNT_ID` (not secret) set as a plain environment variable, or passed
  as `--ig-user-id`.
Until both exist, treat auto-publish as unavailable and fall back to step 6's manual
handoff (image + caption to the user, they post it themselves).

## Reliability (this runs unattended — optimize for finishing, not polish)

- Render the image **once**, view it **once** with Read, fix it if something is
  genuinely broken (clipped text, overlapping elements, a diagram that doesn't render),
  then move on. Do not loop on repeated render/view/tweak cycles chasing a better
  diagram — a clean, correct-enough diagram beats a redrawn one three iterations later.
- The whole run (topic → content → render → caption → commit/push → deliver) should be
  a handful of tool calls, not dozens. If it isn't converging, ship the simplest version
  that renders correctly rather than leaving nothing pushed.
- The very last two things every run does, no exceptions: `git push`, then deliver the
  PNG + caption to the user. A run that stops before either of those has failed even if
  everything before it went fine.

## Conventions

- Card visual system: cream ground `#eef0ea`, card `#fffdf9`, border `#e6e0d2`,
  ink `#1c2b3a`, gold accent `#b3762c`/`#a9793a`. Keep VOL/masthead/footer chrome as-is;
  only `BADGE`/`TITLE`/`LEAD`/`CHART_TITLE`/`DIAGRAM_HTML`/`CTA` change day to day.
- `data/history.json` still drives topic dedup for both the (defunct) email history and
  Instagram; don't stop writing to it.
- VOL is a running counter, not tied 1:1 to the calendar date — two VOLs can share a
  date (e.g. a catch-up run after a missed day). Never reuse or renumber a VOL that's
  already in `data/instagram-history.json`.
