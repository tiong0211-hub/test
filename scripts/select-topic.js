#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_TOPICS_PATH = path.join(__dirname, '..', 'data', 'topics.json');
const DEFAULT_HISTORY_PATH = path.join(__dirname, '..', 'data', 'history.json');
const DEFAULT_WINDOW_DAYS = 14;

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

/** KST = UTC+9, no DST. The Routine that calls this fires at UTC times chosen
 * to land on KST mornings, so "today" must be the KST calendar date, not the
 * UTC one, or a run late in the UTC day logs the wrong (previous) date. */
function todayKst() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function daysAgo(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function pickWeighted(items, weightFn) {
  const weights = items.map(weightFn);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Selects one topic, avoiding repeats used within `windowDays`,
 * and weighting category choice toward categories used less recently.
 */
function selectTopic({
  topicsPath = DEFAULT_TOPICS_PATH,
  historyPath = DEFAULT_HISTORY_PATH,
  windowDays = DEFAULT_WINDOW_DAYS,
  today = todayKst(),
} = {}) {
  const { categories } = loadJson(topicsPath);
  const history = fs.existsSync(historyPath) ? loadJson(historyPath) : [];

  const cutoff = daysAgo(today, windowDays);
  const recent = history.filter((e) => e.date >= cutoff);
  const usedIds = new Set(recent.map((e) => e.topicId));

  const categoryNames = Object.keys(categories);
  const categoryCounts = Object.fromEntries(categoryNames.map((c) => [c, 0]));
  for (const e of recent) {
    if (categoryCounts[e.category] !== undefined) categoryCounts[e.category]++;
  }
  const maxCount = Math.max(0, ...Object.values(categoryCounts));

  const chosenCategory = pickWeighted(
    categoryNames,
    (c) => maxCount - categoryCounts[c] + 1
  );

  let pool = categories[chosenCategory].filter((t) => !usedIds.has(t.id));
  if (pool.length === 0) {
    // Category's pool exhausted within the window; reset to full list.
    pool = categories[chosenCategory];
  }

  const topic = pool[Math.floor(Math.random() * pool.length)];

  const entry = {
    date: today,
    category: chosenCategory,
    topicId: topic.id,
    title: topic.title,
    hint: topic.hint,
    status: 'pending',
  };

  history.push(entry);
  saveJson(historyPath, history);

  return entry;
}

if (require.main === module) {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? true];
    })
  );

  const entry = selectTopic({
    topicsPath: args.topics || DEFAULT_TOPICS_PATH,
    historyPath: args.history || DEFAULT_HISTORY_PATH,
    windowDays: args.window ? Number(args.window) : DEFAULT_WINDOW_DAYS,
    today: args.date || undefined,
  });

  console.log(JSON.stringify(entry, null, 2));
}

module.exports = { selectTopic };
