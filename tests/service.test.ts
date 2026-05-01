import { test, before, after } from "node:test";
import assert from "node:assert/strict";

// Force the service to take the live-data branch instead of the mock fallback.
process.env.GITHUB_TOKEN = "test-token-for-service-tests";

const originalFetch = globalThis.fetch;
let stubTruncated = false;
let stubOwnerLocation: string | null = "Menlo Park, CA";
let stubOwnerProfileStatus = 200;
let lastUrls: string[] = [];

function stubRepoBody() {
  return {
    name: "react",
    full_name: "facebook/react",
    description: "A JavaScript library for building user interfaces",
    stargazers_count: 244723,
    forks_count: 50986,
    language: "JavaScript",
    default_branch: "main",
    fork: false,
    owner: { login: "facebook" },
  };
}

function stubTreeBody() {
  return {
    sha: "deadbeef",
    truncated: stubTruncated,
    tree: [
      { path: "README.md", type: "blob", size: 1024 },
      { path: "package.json", type: "blob", size: 512 },
      { path: "src", type: "tree" },
      { path: "src/index.ts", type: "blob", size: 256 },
      { path: "src/utils.ts", type: "blob", size: 128 },
    ],
  };
}

function stubOwnerProfileBody() {
  return {
    login: "facebook",
    type: "Organization",
    location: stubOwnerLocation,
    name: "Meta",
    blog: "https://opensource.fb.com",
  };
}

before(() => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    lastUrls.push(url);
    if (url.includes("/git/trees/")) {
      return new Response(JSON.stringify(stubTreeBody()), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/users/")) {
      return new Response(JSON.stringify(stubOwnerProfileBody()), {
        status: stubOwnerProfileStatus,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/repos/")) {
      return new Response(JSON.stringify(stubRepoBody()), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error(`unexpected fetch url: ${url}`);
  }) as typeof fetch;
});

after(() => {
  globalThis.fetch = originalFetch;
});

test("service maps tree.truncated=true → treeTruncated=true", async () => {
  stubTruncated = true;
  stubOwnerLocation = "Menlo Park, CA";
  stubOwnerProfileStatus = 200;
  lastUrls = [];
  const { getBriefForUrl } = await import("../lib/github/service");
  const result = await getBriefForUrl("facebook/react");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.treeTruncated, true);
  assert.equal(result.data.meta.owner, "facebook");
  assert.equal(result.data.meta.repo, "react");
  assert.equal(result.data.meta.isMock, false);
  assert.ok(result.data.tree.length > 0);
  // Should have hit all three endpoints.
  assert.ok(lastUrls.some((u) => u.includes("/repos/facebook/react")));
  assert.ok(lastUrls.some((u) => u.includes("/git/trees/main")));
  assert.ok(lastUrls.some((u) => u.includes("/users/facebook")));
});

test("service maps tree.truncated=false → treeTruncated=false", async () => {
  stubTruncated = false;
  stubOwnerLocation = "Menlo Park, CA";
  stubOwnerProfileStatus = 200;
  const { getBriefForUrl } = await import("../lib/github/service");
  const result = await getBriefForUrl("facebook/react");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.treeTruncated, false);
});

test("service maps absent truncated field → treeTruncated=false", async () => {
  const fetchBackup = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/git/trees/")) {
      const body = stubTreeBody();
      // @ts-expect-error - intentionally remove the field
      delete body.truncated;
      return new Response(JSON.stringify(body), { status: 200 });
    }
    if (url.includes("/users/")) {
      return new Response(JSON.stringify(stubOwnerProfileBody()), { status: 200 });
    }
    return new Response(JSON.stringify(stubRepoBody()), { status: 200 });
  }) as typeof fetch;
  try {
    const { getBriefForUrl } = await import("../lib/github/service");
    const result = await getBriefForUrl("facebook/react");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.data.treeTruncated, false);
  } finally {
    globalThis.fetch = fetchBackup;
  }
});

test("service returns 400 for unparseable input without hitting GitHub", async () => {
  const callsBefore = lastUrls.length;
  const { getBriefForUrl } = await import("../lib/github/service");
  const result = await getBriefForUrl("not a repo");
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, 400);
  assert.match(result.error, /parse/i);
  assert.equal(lastUrls.length, callsBefore, "should not call GitHub on parse failure");
});

test("service maps GitHub 404 → ServiceResult status 404", async () => {
  const fetchBackup = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ message: "Not Found" }), {
      status: 404,
    })) as typeof fetch;
  try {
    const { getBriefForUrl } = await import("../lib/github/service");
    const result = await getBriefForUrl("ghost/repo");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 404);
    assert.match(result.error, /not found/i);
  } finally {
    globalThis.fetch = fetchBackup;
  }
});

/* ============== Owner-location fields plumbed end-to-end ============== */

test("service maps owner profile location → meta.ownerCountry/Code/confidence", async () => {
  stubTruncated = false;
  stubOwnerLocation = "Bangalore, India";
  stubOwnerProfileStatus = 200;
  const { getBriefForUrl } = await import("../lib/github/service");
  const result = await getBriefForUrl("facebook/react");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.meta.ownerLocationRaw, "Bangalore, India");
  assert.equal(result.data.meta.ownerCountry, "India");
  assert.equal(result.data.meta.ownerCountryCode, "IN");
  assert.equal(result.data.meta.locationConfidence, "high");
});

test("service maps null owner location → confidence none, country null", async () => {
  stubOwnerLocation = null;
  stubOwnerProfileStatus = 200;
  const { getBriefForUrl } = await import("../lib/github/service");
  const result = await getBriefForUrl("facebook/react");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.meta.ownerLocationRaw, null);
  assert.equal(result.data.meta.ownerCountry, null);
  assert.equal(result.data.meta.ownerCountryCode, null);
  assert.equal(result.data.meta.locationConfidence, "none");
});

test("service maps unmappable owner location → raw preserved, confidence none", async () => {
  stubOwnerLocation = "the third moon of jupiter";
  stubOwnerProfileStatus = 200;
  const { getBriefForUrl } = await import("../lib/github/service");
  const result = await getBriefForUrl("facebook/react");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.meta.ownerLocationRaw, "the third moon of jupiter");
  assert.equal(result.data.meta.ownerCountry, null);
  assert.equal(result.data.meta.ownerCountryCode, null);
  assert.equal(result.data.meta.locationConfidence, "none");
});

/* =========== Project type + onboarding plumbed end-to-end =========== */

test("service populates projectType + onboarding from the tree", async () => {
  // Override fetch to return a tree with a clear Next.js (App Router) signature.
  const fetchBackup = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/git/trees/")) {
      return new Response(
        JSON.stringify({
          sha: "deadbeef",
          truncated: false,
          tree: [
            { path: "README.md", type: "blob", size: 1024 },
            { path: "package.json", type: "blob", size: 512 },
            { path: "next.config.ts", type: "blob", size: 256 },
            { path: "app", type: "tree" },
            { path: "app/layout.tsx", type: "blob", size: 1024 },
            { path: "app/page.tsx", type: "blob", size: 512 },
            { path: "src", type: "tree" },
            { path: "src/components", type: "tree" },
            { path: "src/components/Button.tsx", type: "blob", size: 512 },
            { path: "src/components/Card.tsx", type: "blob", size: 512 },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (url.includes("/users/")) {
      return new Response(JSON.stringify(stubOwnerProfileBody()), { status: 200 });
    }
    return new Response(JSON.stringify(stubRepoBody()), { status: 200 });
  }) as typeof fetch;
  try {
    const { getBriefForUrl } = await import("../lib/github/service");
    const result = await getBriefForUrl("facebook/react");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    // Project type detected.
    assert.ok(result.data.projectType, "projectType should not be null");
    assert.equal(result.data.projectType?.label, "Next.js (App Router)");
    assert.equal(result.data.projectType?.confidence, "high");
    // Onboarding present.
    assert.equal(result.data.onboarding.entryPoint, "app/layout.tsx");
    assert.ok(
      result.data.onboarding.readingList.length >= 3,
      "reading list should have at least 3 items",
    );
    // README is first.
    assert.equal(result.data.onboarding.readingList[0]?.path, "README.md");
    // Important dirs include app and src.
    assert.ok(result.data.onboarding.importantDirs.includes("app"));
    assert.ok(result.data.onboarding.importantDirs.includes("src"));
  } finally {
    globalThis.fetch = fetchBackup;
  }
});

test("service degrades to projectType=null + minimal onboarding for unknown stacks", async () => {
  const fetchBackup = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/git/trees/")) {
      return new Response(
        JSON.stringify({
          sha: "deadbeef",
          truncated: false,
          tree: [
            { path: "LICENSE", type: "blob", size: 1024 },
            { path: "notes.txt", type: "blob", size: 256 },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (url.includes("/users/")) {
      return new Response(JSON.stringify(stubOwnerProfileBody()), { status: 200 });
    }
    return new Response(JSON.stringify(stubRepoBody()), { status: 200 });
  }) as typeof fetch;
  try {
    const { getBriefForUrl } = await import("../lib/github/service");
    const result = await getBriefForUrl("facebook/react");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.data.projectType, null);
    assert.equal(result.data.onboarding.entryPoint, null);
    // Onboarding shape is still well-defined.
    assert.ok(Array.isArray(result.data.onboarding.readingList));
    assert.ok(Array.isArray(result.data.onboarding.importantDirs));
  } finally {
    globalThis.fetch = fetchBackup;
  }
});

test("owner profile fetch failure is NON-FATAL — brief still succeeds", async () => {
  stubTruncated = false;
  stubOwnerLocation = "Menlo Park, CA";
  stubOwnerProfileStatus = 404; // owner profile 404s but the brief should still succeed
  const { getBriefForUrl } = await import("../lib/github/service");
  const result = await getBriefForUrl("facebook/react");
  assert.equal(result.ok, true, "brief must NOT fail when /users/{login} 404s");
  if (!result.ok) return;
  // We degrade gracefully to "owner location unavailable".
  assert.equal(result.data.meta.ownerLocationRaw, null);
  assert.equal(result.data.meta.ownerCountry, null);
  assert.equal(result.data.meta.ownerCountryCode, null);
  assert.equal(result.data.meta.locationConfidence, "none");
  // Repo + tree fields are still populated.
  assert.equal(result.data.meta.owner, "facebook");
  assert.ok(result.data.tree.length > 0);
});
