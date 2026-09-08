#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { selectTopic } = require('./select-topic');

const DEFAULT_IG_HISTORY_PATH = path.join(__dirname, '..', 'data', 'instagram-history.json');

function todayKst() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function loadJson(filePath) {
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : [];
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

/**
 * Picks today's topic (via the shared topic-rotation history in data/history.json,
 * so Instagram and any past email issues never repeat a topic within the window)
 * and assigns the next Instagram VOL number. Instagram numbering is independent
 * of the old email VOL count - it started fresh at 001 on 2026-09-09.
 */
function buildInstagramPost({ igHistoryPath = DEFAULT_IG_HISTORY_PATH, today = todayKst() } = {}) {
  const topic = selectTopic({ today });
  const igHistory = loadJson(igHistoryPath);

  const vol = igHistory.length + 1;
  const entry = {
    date: today,
    vol,
    topicId: topic.topicId,
    category: topic.category,
    title: topic.title,
    hint: topic.hint,
  };

  igHistory.push(entry);
  saveJson(igHistoryPath, igHistory);

  return { ...entry, volPadded: String(vol).padStart(3, '0') };
}

if (require.main === module) {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? true];
    })
  );

  const entry = buildInstagramPost({
    igHistoryPath: args.history || DEFAULT_IG_HISTORY_PATH,
    today: args.date || undefined,
  });

  console.log(JSON.stringify(entry, null, 2));
}

module.exports = { buildInstagramPost };
