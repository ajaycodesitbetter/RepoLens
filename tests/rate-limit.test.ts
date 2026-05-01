import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRateLimitMessage } from "../lib/github/client";

test("primary rate limit with reset header → human-readable wait", () => {
  // 10 minutes from now
  const reset = Math.floor(Date.now() / 1000) + 600;
  const res = new Response(null, {
    status: 403,
    headers: {
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": String(reset),
    },
  });
  const msg = buildRateLimitMessage(res);
  assert.match(msg, /rate limit exceeded/i);
  assert.match(msg, /minute/i);
});

test("primary rate limit shows seconds when wait < 60s", () => {
  const reset = Math.floor(Date.now() / 1000) + 30;
  const res = new Response(null, {
    status: 403,
    headers: {
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": String(reset),
    },
  });
  const msg = buildRateLimitMessage(res);
  assert.match(msg, /\d+ second/i);
});

test("primary rate limit shows hours when wait > 60min", () => {
  const reset = Math.floor(Date.now() / 1000) + 3 * 3600; // 3 hours
  const res = new Response(null, {
    status: 403,
    headers: {
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": String(reset),
    },
  });
  const msg = buildRateLimitMessage(res);
  assert.match(msg, /hour/i);
});

test("primary rate limit shows 'now' when reset is in the past", () => {
  const reset = Math.floor(Date.now() / 1000) - 60;
  const res = new Response(null, {
    status: 403,
    headers: {
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": String(reset),
    },
  });
  const msg = buildRateLimitMessage(res);
  assert.match(msg, /now/i);
});

test("secondary rate limit uses retry-after header", () => {
  const res = new Response(null, {
    status: 403,
    headers: { "retry-after": "45" },
  });
  const msg = buildRateLimitMessage(res);
  assert.match(msg, /slow down/i);
  assert.match(msg, /45 seconds/);
});

test("token hint shown when GITHUB_TOKEN is not set", () => {
  const original = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_TOKEN;
  try {
    const reset = Math.floor(Date.now() / 1000) + 600;
    const res = new Response(null, {
      status: 403,
      headers: {
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": String(reset),
      },
    });
    const msg = buildRateLimitMessage(res);
    assert.match(msg, /GITHUB_TOKEN/);
    assert.match(msg, /5,?000/);
  } finally {
    if (original !== undefined) process.env.GITHUB_TOKEN = original;
  }
});

test("token hint NOT shown when GITHUB_TOKEN is set", () => {
  const original = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = "test-token";
  try {
    const reset = Math.floor(Date.now() / 1000) + 600;
    const res = new Response(null, {
      status: 403,
      headers: {
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": String(reset),
      },
    });
    const msg = buildRateLimitMessage(res);
    assert.doesNotMatch(msg, /GITHUB_TOKEN/);
  } finally {
    if (original === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = original;
  }
});

test("falls back to generic denial message when no rate-limit headers present", () => {
  const res = new Response(null, { status: 403 });
  const msg = buildRateLimitMessage(res);
  assert.match(msg, /denied/i);
  assert.match(msg, /403/);
});

test("ignores malformed reset header", () => {
  const res = new Response(null, {
    status: 403,
    headers: {
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": "not-a-number",
    },
  });
  const msg = buildRateLimitMessage(res);
  // Falls through to the "remaining=0 without timestamp" branch
  assert.match(msg, /rate limit exceeded/i);
});
