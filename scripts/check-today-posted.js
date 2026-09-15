#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { findHoliday, isWeekend } = require('./is-holiday');

const IG_HISTORY_PATH = path.join(__dirname, '..', 'data', 'instagram-history.json');

function todayKst() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Read-only check for the safety-net trigger: does today already have an
 * Instagram post recorded? Never mutates any file (unlike build-instagram-post.js,
 * which assigns a new VOL every time it runs) - safe to call speculatively before
 * deciding whether to run the real pipeline.
 *
 * Returns { skip: true, date, reason } on a weekend/holiday (nothing was ever
 * expected today), or { date, posted } otherwise.
 */
function checkTodayPosted({ igHistoryPath = IG_HISTORY_PATH, today = todayKst() } = {}) {
  const holiday = findHoliday(today);
  if (holiday || isWeekend(today)) {
    return { skip: true, date: today, reason: holiday ? holiday.name : '주말' };
  }

  const history = fs.existsSync(igHistoryPath) ? JSON.parse(fs.readFileSync(igHistoryPath, 'utf8')) : [];
  const posted = history.some((e) => e.date === today);
  return { date: today, posted };
}

if (require.main === module) {
  console.log(JSON.stringify(checkTodayPosted(), null, 2));
}

module.exports = { checkTodayPosted };
