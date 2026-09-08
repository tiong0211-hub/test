#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'newsletter-template.html');

/**
 * Fills {{PLACEHOLDER}} tokens in an HTML template with values from `content`.
 * Throws if the template references a placeholder missing from `content`.
 */
function renderNewsletter(templatePath, content) {
  const template = fs.readFileSync(templatePath, 'utf8');
  const missing = [];

  const html = template.replace(/{{\s*([A-Z_]+)\s*}}/g, (match, key) => {
    if (!(key in content)) {
      missing.push(key);
      return match;
    }
    return String(content[key]);
  });

  if (missing.length > 0) {
    throw new Error(`Missing content for placeholders: ${[...new Set(missing)].join(', ')}`);
  }

  return html;
}

/** Rough HTML-to-plain-text fallback for multipart/alternative emails. */
function toPlainText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h1|h2)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

if (require.main === module) {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? true];
    })
  );

  if (!args.content) {
    console.error('Usage: node render-newsletter.js --content=<path-to-json> [--template=<path>] [--out=<path>]');
    process.exit(1);
  }

  const content = JSON.parse(fs.readFileSync(args.content, 'utf8'));
  const html = renderNewsletter(args.template || DEFAULT_TEMPLATE_PATH, content);

  if (args.out) {
    fs.writeFileSync(args.out, html);
    console.error(`Rendered HTML written to ${args.out}`);
  } else {
    process.stdout.write(html);
  }
}

module.exports = { renderNewsletter, toPlainText };
