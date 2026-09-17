# Plant Engineer Daily Insight

Daily Instagram card generator. One topic per day, explained for a plant-engineering
audience, with a cross-discipline analogy back to plant engineering.

**Email sending is discontinued** (`scripts/send-email.js`, `templates/newsletter-template.html`,
`data/drafts/`) — kept for reference only, do not run. Instagram is now the only channel.

**No posts on weekends or Korean public holidays** — same convention as the old email
pipeline. `scripts/build-instagram-post.js` enforces this in code (via
`scripts/is-holiday.js` + `data/kr-holidays.json`): on a skip day it returns
`{skip: true, date, reason}` *without* touching any history file, rather than a topic/VOL
entry. If step 1 below prints `skip: true`, do nothing else — no content, no render, no
commit, just end the turn (a short "오늘은 <reason>이라 건너뜁니다" note is enough; posting
nothing is the correct, successful outcome for that day, not a failure). The Routine's
cron schedule is already restricted to weekdays so it mostly won't even fire on
weekends — this code-level check is what catches Korean public holidays that fall on a
weekday, and covers any manual/local run too.
Lunar-calendar holidays (Seollal, Buddha's Birthday, Chuseok) in `data/kr-holidays.json`
are rough best-effort estimates flagged `"confidence": "low - 검증 필요"` — double-check
the exact date against a real calendar (data.go.kr or similar) before relying on it for
a year not yet verified, and add each new year's entries before that year starts.

## Daily pipeline

0. **Sync the repo before anything else — do not investigate or "fix" a detached HEAD,
   it's expected.** A fresh session's checkout of this repo often starts on a detached
   HEAD, sometimes behind `origin`. Don't treat that as a problem to diagnose — just run:
   ```
   git fetch origin claude/plant-engineer-daily-newsletter-gfu1qt
   git checkout -B claude/plant-engineer-daily-newsletter-gfu1qt origin/claude/plant-engineer-daily-newsletter-gfu1qt
   ```
   This always lands you on the branch, at its latest pushed commit, in one step (works
   whether the prior state was detached, stale, or already correct). Do this before
   step 1 so topic/VOL selection reads current history files, not stale ones.

1. `node scripts/build-instagram-post.js` — picks today's topic (reuses the existing
   14-day no-repeat rotation in `data/history.json` via `select-topic.js`) and assigns
   the next Instagram VOL number (`data/instagram-history.json`, independent of the old
   email VOL count — restarted at 001 on 2026-09-09). Prints `{vol, volPadded, category,
   topicId, title, hint, date}` and appends the entry — or, on a weekend/holiday, prints
   `{skip: true, date, reason}` and appends nothing (see above; stop here on a skip).
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
   day), then `git add` and `git commit`. Push with an explicit refspec, not a bare
   `git push`:
   ```
   git push origin HEAD:claude/plant-engineer-daily-newsletter-gfu1qt
   ```
   This succeeds regardless of whether HEAD is detached or on the branch, so it can't
   fail with a "not currently on a branch" error even if step 0 was somehow skipped.
   Do not skip the push — an unpushed run has produced nothing. If the push is rejected
   as non-fast-forward, `git fetch` + `git rebase origin/claude/plant-engineer-daily-newsletter-gfu1qt`
   and retry once — don't force-push.
6. Push the PNG to the user as a downloadable file (`display: "attach"`) and the
   caption as chat text. **Then stop.** Do not ask "게시할까요?" and do not call
   `scripts/publish-instagram.js` — publishing to Instagram is manual now (the user
   uploads the delivered PNG + caption themselves). See "Why the daily automation was
   simplified" below for why, and "Instagram auto-publish setup" for the mechanism this
   used to use (kept working, just not invoked automatically) in case a specific post
   is ever a rare exception worth publishing on the user's behalf, on their explicit ask.

## Why the daily automation was simplified

Between 2026-09-12 and 2026-09-17, the daily Routine (and a second "safety-net" Routine
added to catch its failures) reported `SUCCEEDED` on the dashboard while pushing nothing
five separate times, for at least four different root causes: a dead weekend-skip script
followed by mistake, a detached-HEAD `git push` failure, and (twice, with the same
`worker_epoch: 2` signature in session metadata both times) what looks like a
mid-session container restart — an infra-level failure no prompt wording can prevent.
Each time, the user had to notice and ask for a manual catch-up in a live chat.

Given that, the auto-publish approval loop (build → render → caption → commit/push →
ask "게시할까요?" → call `publish-instagram.js` on approval) was removed from the
unattended path entirely — one less automated step, one less thing to silently fail
mid-way and burn tokens on. The Routine now only generates content and hands it to the
user (step 6 above); they publish to Instagram themselves. The `git commit`/`push` step
is *not* removed — `data/history.json` and `data/instagram-history.json` need a durable,
shared record across every day's fresh session for topic dedup and VOL numbering to work
at all, so it stays, and can still fail for the same reasons as before. If a Routine run
ever reports success with no new commit, the fix is the same one used throughout
2026-09-12 to 2026-09-17: run the "Daily pipeline" steps manually in a live session
(skip step 7 - there is no step 7 anymore) and deliver the result the same way.

## Instagram auto-publish setup

Done (2026-09-11) via the classic Graph API (Facebook Login) flow — not the newer
"Instagram API with Instagram Login" product, which requires the target Instagram
account to independently register as a Meta developer and repeatedly hit that wall.
Even though `plantengineer_insights` has no linked Facebook Page (so `/me/accounts`
returns nothing for a normal user token), its ID is reachable once connected as an
asset in the same Business Portfolio ("Tiong's story", business ID `1111206594919812`),
and works directly against `/{ig-user-id}/media` and `/{ig-user-id}/media_publish`.

The credential is a **System User access token** (System User `instagram-automation`,
id `122098542771476818`, created under the Business Portfolio's 설정 → 사용자 → 시스템
사용자), not a personal user token — this was a deliberate upgrade from the first
working version, which used a 60-day long-lived user token. The System User has the
`플랜트_인사이트` app assigned (앱 관리 role) and the `plantengineer_insights` Instagram
account assigned (full control) as its two asset grants; its token was generated scoped
to `instagram_basic` + `instagram_content_publish` with **no expiry** — System User
tokens don't carry the 60-day limit personal user tokens do, so this one does not need
periodic renewal.
- The token is registered as a Claude Code cloud environment **API credential**:
  Allowed website `graph.facebook.com`, Bearer token. It's never visible to this session
  or in code — `scripts/publish-instagram.js` relies on the agent proxy to attach it.
  If it ever needs replacing (revoked, System User deleted, scope change), regenerate
  from that System User's page (Business Settings → 사용자 → 시스템 사용자 →
  instagram-automation → 토큰 생성) and have the user re-register it themselves — the
  token value should never be pasted into this chat or committed anywhere in this
  public repo.
- `data/instagram-config.json` holds `igBusinessAccountId` (not secret) as the default
  for `--ig-user-id`.

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
  everything before it went fine — the one exception is a step-1 `skip: true` (weekend
  or holiday), where doing nothing further *is* the correct outcome, not a failure.

## Conventions

- Card visual system: cream ground `#eef0ea`, card `#fffdf9`, border `#e6e0d2`,
  ink `#1c2b3a`, gold accent `#b3762c`/`#a9793a`. Keep VOL/masthead/footer chrome as-is;
  only `BADGE`/`TITLE`/`LEAD`/`CHART_TITLE`/`DIAGRAM_HTML`/`CTA` change day to day.
- `data/history.json` still drives topic dedup for both the (defunct) email history and
  Instagram; don't stop writing to it.
- VOL is a running counter, not tied 1:1 to the calendar date — two VOLs can share a
  date (e.g. a catch-up run after a missed day). Never reuse or renumber a VOL that's
  already in `data/instagram-history.json`.
