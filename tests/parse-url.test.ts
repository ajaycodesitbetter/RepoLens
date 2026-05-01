import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRepoUrl } from "../lib/github/parse-url";

test("parses owner/repo shorthand", () => {
  assert.deepEqual(parseRepoUrl("facebook/react"), { owner: "facebook", repo: "react" });
});

test("parses full https URL", () => {
  assert.deepEqual(parseRepoUrl("https://github.com/facebook/react"), {
    owner: "facebook",
    repo: "react",
  });
});

test("parses bare github.com URL (no protocol)", () => {
  assert.deepEqual(parseRepoUrl("github.com/facebook/react"), {
    owner: "facebook",
    repo: "react",
  });
});

test("normalizes mixed-case host", () => {
  assert.deepEqual(parseRepoUrl("https://GitHub.com/facebook/react"), {
    owner: "facebook",
    repo: "react",
  });
});

test("normalizes www. prefix", () => {
  assert.deepEqual(parseRepoUrl("https://www.github.com/facebook/react"), {
    owner: "facebook",
    repo: "react",
  });
});

test("normalizes WWW + mixed-case host", () => {
  assert.deepEqual(parseRepoUrl("https://WWW.GitHub.com/facebook/react"), {
    owner: "facebook",
    repo: "react",
  });
});

test("strips trailing slash", () => {
  assert.deepEqual(parseRepoUrl("https://github.com/facebook/react/"), {
    owner: "facebook",
    repo: "react",
  });
});

test("strips .git suffix from URL", () => {
  assert.deepEqual(parseRepoUrl("https://github.com/facebook/react.git"), {
    owner: "facebook",
    repo: "react",
  });
});

test("strips .git suffix from shorthand", () => {
  assert.deepEqual(parseRepoUrl("facebook/react.git"), {
    owner: "facebook",
    repo: "react",
  });
});

test("handles /tree/<branch> URL", () => {
  assert.deepEqual(parseRepoUrl("https://github.com/facebook/react/tree/main"), {
    owner: "facebook",
    repo: "react",
  });
});

test("handles /tree/<branch>/<sub> URL", () => {
  assert.deepEqual(
    parseRepoUrl("https://github.com/facebook/react/tree/main/packages/react"),
    { owner: "facebook", repo: "react" },
  );
});

test("handles /blob/<branch>/<path> URL", () => {
  assert.deepEqual(
    parseRepoUrl("https://github.com/facebook/react/blob/main/README.md"),
    { owner: "facebook", repo: "react" },
  );
});

test("strips query string", () => {
  assert.deepEqual(
    parseRepoUrl("https://github.com/facebook/react?tab=readme-ov-file"),
    { owner: "facebook", repo: "react" },
  );
});

test("strips fragment", () => {
  assert.deepEqual(parseRepoUrl("https://github.com/facebook/react#installation"), {
    owner: "facebook",
    repo: "react",
  });
});

test("trims surrounding whitespace", () => {
  assert.deepEqual(parseRepoUrl("  facebook/react  "), {
    owner: "facebook",
    repo: "react",
  });
});

test("rejects empty input", () => {
  assert.equal(parseRepoUrl(""), null);
});

test("rejects shorthand with only an owner", () => {
  assert.equal(parseRepoUrl("facebook"), null);
});

test("rejects garbage", () => {
  assert.equal(parseRepoUrl("not a repo"), null);
});

test("rejects SSH git URL", () => {
  // SSH form is intentionally not supported.
  assert.equal(parseRepoUrl("git@github.com:facebook/react.git"), null);
});

test("rejects invalid owner with double dots", () => {
  assert.equal(parseRepoUrl("face..book/react"), null);
});

test("rejects reserved namespace: orgs", () => {
  assert.equal(parseRepoUrl("https://github.com/orgs/facebook"), null);
});

test("rejects reserved namespace: topics", () => {
  assert.equal(parseRepoUrl("https://github.com/topics/react"), null);
});

test("rejects reserved namespace: marketplace", () => {
  assert.equal(parseRepoUrl("github.com/marketplace/copilot"), null);
});

test("rejects reserved namespace: settings", () => {
  assert.equal(parseRepoUrl("settings/anything"), null);
});

test("reserved namespace check is case-insensitive", () => {
  assert.equal(parseRepoUrl("https://github.com/ORGS/facebook"), null);
});

test("accepts repo names with dots and underscores", () => {
  assert.deepEqual(parseRepoUrl("vercel/next.js"), {
    owner: "vercel",
    repo: "next.js",
  });
  assert.deepEqual(parseRepoUrl("owner/my_repo"), {
    owner: "owner",
    repo: "my_repo",
  });
});

test("accepts http (insecure) protocol", () => {
  assert.deepEqual(parseRepoUrl("http://github.com/facebook/react"), {
    owner: "facebook",
    repo: "react",
  });
});

test("handles double slash in path gracefully", () => {
  assert.deepEqual(parseRepoUrl("https://github.com//facebook/react"), {
    owner: "facebook",
    repo: "react",
  });
});

test("handles non-string input", () => {
  // @ts-expect-error - intentionally testing runtime guard
  assert.equal(parseRepoUrl(null), null);
  // @ts-expect-error - intentionally testing runtime guard
  assert.equal(parseRepoUrl(undefined), null);
  // @ts-expect-error - intentionally testing runtime guard
  assert.equal(parseRepoUrl(42), null);
});
