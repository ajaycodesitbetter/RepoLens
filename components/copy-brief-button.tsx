"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { briefToMarkdown } from "@/lib/analysis/brief-to-markdown";
import type {
  OnboardingBrief,
  ProjectType,
  RepoMeta,
} from "@/lib/types";

type Status = "idle" | "copied" | "error";

/**
 * Tiny client island that renders a "Copy as markdown" button.
 * The markdown is built from props on click — no fetch, no extra state
 * round-trip, no new endpoint. Falls back to a textarea + execCommand on
 * very old browsers / non-secure contexts.
 */
export function CopyBriefButton({
  meta,
  projectType,
  onboarding,
  branch,
}: {
  meta: RepoMeta;
  projectType: ProjectType | null;
  onboarding: OnboardingBrief;
  branch: string;
}) {
  const [status, setStatus] = useState<Status>("idle");

  // Reset the "Copied!" / "Failed" label after a short delay.
  useEffect(() => {
    if (status === "idle") return;
    const id = window.setTimeout(() => setStatus("idle"), 1800);
    return () => window.clearTimeout(id);
  }, [status]);

  const handleClick = useCallback(async () => {
    const md = briefToMarkdown({ meta, projectType, onboarding, branch });
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(md);
        setStatus("copied");
        return;
      }
      // Legacy fallback for non-secure contexts (e.g. http://).
      const ta = document.createElement("textarea");
      ta.value = md;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      setStatus(ok ? "copied" : "error");
    } catch {
      setStatus("error");
    }
  }, [meta, projectType, onboarding, branch]);

  const label =
    status === "copied"
      ? "Copied!"
      : status === "error"
        ? "Copy failed"
        : "Copy as markdown";

  const Icon = status === "copied" ? Check : Copy;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-live="polite"
      title="Copy this onboarding brief as Markdown"
      className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <Icon aria-hidden="true" className="h-3 w-3" />
      <span>{label}</span>
    </button>
  );
}
