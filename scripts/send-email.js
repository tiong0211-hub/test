#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { toPlainText } = require('./render-newsletter');

const RESEND_API_URL = 'https://api.resend.com/emails';
const RESEND_BROADCASTS_URL = 'https://api.resend.com/broadcasts';

/**
 * Resend API 키는 이 코드가 직접 다루지 않는다. Claude Code 클라우드 환경의
 * "API credentials"(api.resend.com용 Bearer 자격증명)로 등록해두면, 에이전트
 * 프록시가 이 세션에서 나가는 요청에 실제 키를 자동으로 붙여준다 — 키 값은
 * 세션/환경변수/코드 어디에도 노출되지 않는다.
 * 로컬 개발 등 프록시가 없는 환경에서만 RESEND_API_KEY를 환경변수로 넘겨
 * 수동으로 Authorization 헤더를 채울 수 있게 폴백을 남겨둔다.
 */
function authHeaders(apiKey = process.env.RESEND_API_KEY) {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

/**
 * Sends the draft newsletter (as a preview) to the publisher's own inbox for review.
 * Uses Resend's transactional /emails endpoint (single recipient).
 */
async function sendPreview({ to, subject, html, apiKey, from = process.env.SENDER_EMAIL }) {
  requireEnvOrThrow({ from: 'SENDER_EMAIL' }, { from });

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      ...authHeaders(apiKey),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text: toPlainText(html),
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend preview send failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

/**
 * Sends the final newsletter to the customer audience (list managed in the
 * email service, not in this repo) via Resend's /broadcasts endpoint.
 * Only subscribers with an active/subscribed status receive it; unsubscribed
 * contacts are automatically excluded by the email service.
 */
async function sendBroadcast({
  audienceId = process.env.SUBSCRIBER_AUDIENCE_ID,
  subject,
  html,
  apiKey,
  from = process.env.SENDER_EMAIL,
}) {
  requireEnvOrThrow(
    { from: 'SENDER_EMAIL', audienceId: 'SUBSCRIBER_AUDIENCE_ID' },
    { from, audienceId }
  );

  const createRes = await fetch(RESEND_BROADCASTS_URL, {
    method: 'POST',
    headers: {
      ...authHeaders(apiKey),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audience_id: audienceId,
      from,
      subject,
      html,
      text: toPlainText(html),
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Resend broadcast create failed (${createRes.status}): ${await createRes.text()}`);
  }
  const broadcast = await createRes.json();

  const sendRes = await fetch(`${RESEND_BROADCASTS_URL}/${broadcast.id}/send`, {
    method: 'POST',
    headers: authHeaders(apiKey),
  });

  if (!sendRes.ok) {
    throw new Error(`Resend broadcast send failed (${sendRes.status}): ${await sendRes.text()}`);
  }
  return sendRes.json();
}

function requireEnvOrThrow(nameMap, values) {
  for (const [key, envName] of Object.entries(nameMap)) {
    if (!values[key]) throw new Error(`Missing required environment variable: ${envName}`);
  }
}

if (require.main === module) {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? true];
    })
  );

  if (!args.mode || !args.html || !args.subject) {
    console.error(
      'Usage: node send-email.js --mode=preview --to=<email> --subject="..." --html=<path> [--out=<path>]\n' +
      '       node send-email.js --mode=broadcast --subject="..." --html=<path>'
    );
    process.exit(1);
  }

  const html = fs.readFileSync(args.html, 'utf8');

  const run = args.mode === 'preview'
    ? sendPreview({ to: args.to, subject: args.subject, html })
    : sendBroadcast({ subject: args.subject, html });

  run
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}

module.exports = { sendPreview, sendBroadcast };
