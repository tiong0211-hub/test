#!/usr/bin/env node
'use strict';

// Non-AI watchdog for CI: exits non-zero (failing the GitHub Actions job, which
// triggers GitHub's own failure-notification email) if today's Instagram post
// never got committed. Runs a fixed delay after the daily Routine's fire time.
// See CLAUDE.md's "Daily post watchdog" section for what to do when this fires.

const { checkTodayPosted } = require('./check-today-posted');

const result = checkTodayPosted();
console.log(JSON.stringify(result, null, 2));

if (result.skip) {
  console.log(`Skip day (${result.reason}) — nothing expected today. OK.`);
  process.exit(0);
}

if (!result.posted) {
  console.error(`No Instagram post found for ${result.date} — today's automated run did not land.`);
  process.exit(1);
}

console.log(`OK — ${result.date} already posted.`);
