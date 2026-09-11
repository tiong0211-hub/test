#!/usr/bin/env node
'use strict';

/**
 * Must run with NODE_USE_ENV_PROXY=1 (`npm run publish-ig` already sets this) - Node's
 * built-in fetch does not read HTTPS_PROXY by default, so without it these requests
 * bypass the credential-injecting agent proxy and fail (either a misleading auth error,
 * or the egress network rejecting the direct connection outright).
 */

const fs = require('fs');
const path = require('path');

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const CONFIG_PATH = path.join(__dirname, '..', 'data', 'instagram-config.json');

/** igBusinessAccountId is not secret - committed in data/instagram-config.json as the default. */
function defaultIgUserId() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')).igBusinessAccountId;
  } catch {
    return undefined;
  }
}

/**
 * The Instagram Graph API access token is never handled directly by this code.
 * Register it in the Claude Code cloud environment's "API credentials" (the same
 * mechanism used for the Resend key): Allowed website = graph.facebook.com,
 * Credential type = Bearer. The agent proxy then attaches the Authorization header
 * to outbound requests to that host automatically - the token value never appears
 * in this session or in code.
 * For local development without the proxy, IG_ACCESS_TOKEN can be set manually.
 */
function authHeaders(accessToken = process.env.IG_ACCESS_TOKEN) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

/**
 * Publishes a single image post to an Instagram professional account via the
 * two-step Graph API flow: create a media container from a publicly reachable
 * image URL, then publish that container.
 *
 * `imageUrl` must be reachable by Meta's servers (not this session's network) -
 * a raw.githubusercontent.com URL to a committed PNG works since this repo is public.
 */
async function publishInstagramPost({ igUserId, imageUrl, caption, accessToken }) {
  const createRes = await fetch(`${GRAPH_API_BASE}/${igUserId}/media`, {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image_url: imageUrl, caption }),
  });

  if (!createRes.ok) {
    throw new Error(`Instagram media container creation failed (${createRes.status}): ${await createRes.text()}`);
  }
  const { id: creationId } = await createRes.json();

  const publishRes = await fetch(`${GRAPH_API_BASE}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ creation_id: creationId }),
  });

  if (!publishRes.ok) {
    throw new Error(`Instagram media publish failed (${publishRes.status}): ${await publishRes.text()}`);
  }
  return publishRes.json();
}

if (require.main === module) {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, '').split(/=(.*)/s);
      return [k, v ?? true];
    })
  );

  const igUserId = args['ig-user-id'] || process.env.IG_BUSINESS_ACCOUNT_ID || defaultIgUserId();
  if (!args['image-url'] || !igUserId) {
    console.error(
      'Usage: node publish-instagram.js --image-url=<public https url> [--ig-user-id=<id>] ' +
      '(--caption="..." | --caption-file=<path>)\n' +
      'ig-user-id defaults to data/instagram-config.json, or IG_BUSINESS_ACCOUNT_ID env var.'
    );
    process.exit(1);
  }

  const caption = args['caption-file']
    ? fs.readFileSync(args['caption-file'], 'utf8')
    : (args.caption || '');

  publishInstagramPost({ igUserId, imageUrl: args['image-url'], caption })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}

module.exports = { publishInstagramPost };
