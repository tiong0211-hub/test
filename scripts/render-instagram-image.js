#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { renderNewsletter } = require('./render-newsletter');

const DEFAULT_TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'instagram-post-template.html');
const CHROMIUM_PATH = '/opt/pw-browsers/chromium';

/**
 * Renders an Instagram post template (English-only, 1080x1350) to a PNG file.
 * `content` fills the {{PLACEHOLDER}} tokens in templates/instagram-post-template.html -
 * VOL, DATE, BADGE, TITLE, LEAD, CHART_TITLE, DIAGRAM_HTML, CTA.
 */
async function renderInstagramImage({ content, outPath, templatePath = DEFAULT_TEMPLATE_PATH }) {
  const { chromium } = require('playwright');

  const html = renderNewsletter(templatePath, content);
  const tmpHtmlPath = path.join(os.tmpdir(), `ig-post-${Date.now()}.html`);
  fs.writeFileSync(tmpHtmlPath, html);

  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
    await page.goto('file://' + tmpHtmlPath);
    await page.waitForTimeout(150);
    await page.screenshot({ path: outPath });
  } finally {
    await browser.close();
    fs.unlinkSync(tmpHtmlPath);
  }

  return outPath;
}

if (require.main === module) {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? true];
    })
  );

  if (!args.content || !args.out) {
    console.error('Usage: node render-instagram-image.js --content=<path-to-json> --out=<path.png> [--template=<path>]');
    process.exit(1);
  }

  const content = JSON.parse(fs.readFileSync(args.content, 'utf8'));

  renderInstagramImage({ content, outPath: args.out, templatePath: args.template || DEFAULT_TEMPLATE_PATH })
    .then((outPath) => console.log('Rendered', outPath))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}

module.exports = { renderInstagramImage };
