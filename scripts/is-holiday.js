#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_HOLIDAYS_PATH = path.join(__dirname, '..', 'data', 'kr-holidays.json');

function todayKst() {
  // KST = UTC+9, no DST.
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

/** Returns the holiday entry for `date` (YYYY-MM-DD), or null if it's not a holiday. */
function findHoliday(date, holidaysPath = DEFAULT_HOLIDAYS_PATH) {
  const data = JSON.parse(fs.readFileSync(holidaysPath, 'utf8'));
  const year = date.slice(0, 4);
  const entries = data[year] || [];
  return entries.find((e) => e.date === date) || null;
}

/** True if `date` (YYYY-MM-DD) is a Saturday or Sunday, per KST calendar date. */
function isWeekend(date) {
  const day = new Date(date + 'T00:00:00Z').getUTCDay();
  return day === 0 || day === 6;
}

if (require.main === module) {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? true];
    })
  );

  const date = args.date || todayKst();
  const holiday = findHoliday(date, args.holidays);
  const weekend = isWeekend(date);

  if (holiday || weekend) {
    console.log(JSON.stringify({ date, skip: true, reason: holiday ? holiday.name : '주말', holiday }, null, 2));
    process.exit(1); // non-zero exit signals "skip today"
  }
  console.log(JSON.stringify({ date, skip: false }, null, 2));
  process.exit(0);
}

module.exports = { findHoliday, isWeekend, todayKst };
