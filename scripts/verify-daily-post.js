#!/usr/bin/env node
'use strict';

// Non-AI watchdog for CI: reports whether today's Instagram post got committed.
// Always exits 0 (no GitHub failure-notification email) - the user disabled
// that email on 2026-09-30. Check this job's log in the Actions tab instead.
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
  process.exit(0);
}

console.log(`OK — ${result.date} already posted.`);
