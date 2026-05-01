"use client";

/**
 * Top-level client orchestrator for the developer brief UI.
 * Owns input + fetch state. Renders the page shell, calls /api/repo,
 * and dispatches into RepoMeta + FileTree + TopFiles.
 */

import * as React from "react";
import {
  Github,
  AlertCircle,
  Info,
  ListTree,
  Star,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { RepoInput } from "@/components/repo-input";
import { RepoMeta } from "@/components/repo-meta";
import { FileTree } from "@/components/file-tree";
import { TopFiles } from "@/components/top-files";
import { OnboardingBriefCard } from "@/components/onboarding-brief";
import { BackgroundGlobe } from "@/components/background-globe";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BriefResponse, ApiError } from "@/lib/types";

const EXAMPLES = [
  { label: "facebook/react", hint: "UI library" },
  { label: "vercel/next.js", hint: "React framework" },
  { label: "vuejs/core", hint: "Vue 3 core" },
  { label: "rust-lang/rust", hint: "Rust compiler" },
];

type FetchState =
  | { kind: "idle" }
  | { kind: "loading"; query: string }
  | { kind: "error"; query: string; message: string }
  | { kind: "success"; query: string; data: BriefResponse };

export function Explorer() {
  const [input, setInput] = React.useState("");
  const [state, setState] = React.useState<FetchState>({ kind: "idle" });

  const runQuery = React.useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setState({ kind: "loading", query: trimmed });
    try {
      const res = await fetch(`/api/repo?url=${encodeURIComponent(trimmed)}`, {
        headers: { Accept: "application/json" },
      });
      const json = (await res.json()) as BriefResponse | ApiError;
      if (!res.ok) {
        const message = (json as ApiError).error ?? "Something went wrong.";
        setState({ kind: "error", query: trimmed, message });
        return;
      }
      setState({ kind: "success", query: trimmed, data: json as BriefResponse });
    } catch {
      setState({
        kind: "error",
        query: trimmed,
        message: "Could not reach the server. Check your connection and try again.",
      });
    }
  }, []);

  const handleExample = (ex: string) => {
    setInput(ex);
    void runQuery(ex);
  };

  const handleRetry = React.useCallback(() => {
    if (state.kind === "error") void runQuery(state.query);
  }, [state, runQuery]);

  const handleReset = React.useCallback(() => {
    setInput("");
    setState({ kind: "idle" });
  }, []);

  const isLoading = state.kind === "loading";
  const hasResult = state.kind !== "idle";

  // Determine globe state from current result.
  let globeCountry: string | null = null;
  let globeHighlight = false;
  if (state.kind === "success") {
    const m = state.data.meta;
    if (
      m.ownerCountryCode &&
      (m.locationConfidence === "high" || m.locationConfidence === "medium")
    ) {
      globeCountry = m.ownerCountryCode;
      globeHighlight = true;
    }
  }

  return (
    <div className="min-h-screen">
      <BackgroundGlobe
        countryCode={globeCountry}
        highlight={globeHighlight}
      />

      {/* Slim brand header */}
      <header className="border-b border-border bg-card/10 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Github
                aria-hidden="true"
                className="h-4 w-4 text-primary-foreground"
              />
            </div>
            <div className="leading-tight">
              <div className="font-serif text-lg tracking-tight text-foreground">
                RepoContext
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                public repo briefs
              </div>
            </div>
          </div>
          {hasResult && (
            <button
              type="button"
              onClick={handleReset}
              className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              new search
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6">
        {state.kind === "idle" ? (
          <Hero
            input={input}
            setInput={setInput}
            onSubmit={() => runQuery(input)}
            onExample={handleExample}
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
            {/* LEFT: input + metadata */}
            <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start">
              <RepoInput
                value={input}
                onChange={setInput}
                onSubmit={() => runQuery(input)}
                isLoading={isLoading}
              />
              {state.kind === "loading" && <SidebarSkeleton />}
              {state.kind === "error" && <SidebarErrorPlaceholder />}
              {state.kind === "success" && <RepoMeta meta={state.data.meta} />}
            </aside>

            {/* RIGHT: details + tabs */}
            <section className="min-w-0 space-y-4">
              {state.kind === "loading" && (
                <LoadingMain query={state.query} />
              )}
              {state.kind === "error" && (
                <ErrorMain
                  query={state.query}
                  message={state.message}
                  onRetry={handleRetry}
                  onReset={handleReset}
                />
              )}
              {state.kind === "success" && <SuccessMain data={state.data} />}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

/* ====================== HERO (idle state) ====================== */

function Hero({
  input,
  setInput,
  onSubmit,
  onExample,
}: {
  input: string;
  setInput: (v: string) => void;
  onSubmit: () => void;
  onExample: (q: string) => void;
}) {
  // Editorial composition. Serif display for the headline, mono for code
  // chips, sans for body. Globe is visible behind — palette tuned accordingly.
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-10 px-4 pb-16 pt-16 text-center sm:pt-24">
      {/* Eyebrow tag */}
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 backdrop-blur-md">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">
          Public repo briefs · No AI
        </span>
      </div>

      {/* Editorial headline */}
      <h1 className="font-serif text-5xl leading-[1.02] tracking-tight text-white sm:text-6xl md:text-7xl">
        Read <em className="italic text-primary">any</em> GitHub repo,
        <br />
        <span className="text-white/65">in seconds.</span>
      </h1>

      {/* Sub */}
      <p className="max-w-lg text-base leading-relaxed text-white/60">
        Paste a GitHub URL or{" "}
        <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[13px] text-white/90">
          owner/repo
        </code>
        . We surface the file tree and the files most worth reading first — no
        signups, no agents.
      </p>

      {/* Input */}
      <div className="w-full max-w-2xl">
        <RepoInput
          value={input}
          onChange={setInput}
          onSubmit={onSubmit}
          autoFocus
        />
      </div>

      {/* Examples */}
      <div className="w-full max-w-2xl space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
          Try one
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => onExample(ex.label)}
              className="group flex flex-col items-start gap-0.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3 text-left backdrop-blur-md transition-all hover:border-primary/40 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-mono text-xs font-medium text-white/85 transition-colors group-hover:text-primary">
                {ex.label}
              </span>
              <span className="text-[11px] text-white/45">{ex.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ====================== LOADING ====================== */

function SidebarSkeleton() {
  return (
    <div
      className="space-y-3 rounded-xl border border-border bg-card/10 backdrop-blur-sm px-4 py-4"
      aria-busy="true"
    >
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    </div>
  );
}

function LoadingMain({ query }: { query: string }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground">
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        <span>
          Loading{" "}
          <code className="rounded bg-background px-1.5 py-0.5 font-mono text-xs text-foreground">
            {query}
          </code>
          …
        </span>
      </div>
      <div className="space-y-2 rounded-xl border border-border bg-card/10 backdrop-blur-sm p-4">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2"
            style={{ paddingLeft: `${(i % 4) * 14}px` }}
          >
            <Skeleton className="h-3.5 w-3.5 shrink-0 rounded-sm" />
            <Skeleton
              className={`h-4 ${
                i % 4 === 0 ? "w-32" : i % 4 === 1 ? "w-48" : i % 4 === 2 ? "w-40" : "w-24"
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ====================== ERROR ====================== */

function SidebarErrorPlaceholder() {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
      <p className="text-xs text-muted-foreground">
        Repository details will appear here once the request succeeds.
      </p>
    </div>
  );
}

function ErrorMain({
  query,
  message,
  onRetry,
  onReset,
}: {
  query: string;
  message: string;
  onRetry: () => void;
  onReset: () => void;
}) {
  return (
    <div
      role="alert"
      className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-destructive">
            We couldn’t load that repo.
          </p>
          <p className="mt-1 text-sm text-foreground/80">{message}</p>
          <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">
            input:{" "}
            <code className="rounded bg-background px-1.5 py-0.5 text-[11px] text-foreground">
              {query}
            </code>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pl-8">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
          Try again
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Start over
        </button>
      </div>
    </div>
  );
}

/* ====================== NOTICES ====================== */

function TruncatedNotice() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
      <Info
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
      />
      <p className="text-amber-800 dark:text-amber-300">
        <strong>This file tree is partial.</strong> The repo is large enough
        that GitHub returned a truncated listing — some files and folders are
        not shown below.
      </p>
    </div>
  );
}

function MockNotice() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
      <Info
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
      />
      <p className="text-amber-800 dark:text-amber-300">
        <strong>No GITHUB_TOKEN configured.</strong> Showing sample mock data.
        Set the{" "}
        <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs dark:bg-amber-900">
          GITHUB_TOKEN
        </code>{" "}
        environment variable to fetch live repository data.
      </p>
    </div>
  );
}

/* ====================== SUCCESS — RIGHT COLUMN ====================== */

function SuccessMain({ data }: { data: BriefResponse }) {
  const fileCount = data.tree.filter((e) => e.type === "blob").length;
  const dirCount = data.tree.filter((e) => e.type === "tree").length;
  const totalEntries = data.tree.length;

  return (
    <>
      {data.meta.isMock && <MockNotice />}
      {data.treeTruncated && <TruncatedNotice />}

      {/* Details row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-card/10 backdrop-blur-sm px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
        <span>
          <span className="text-muted-foreground/60">branch:</span>{" "}
          <span className="text-foreground">{data.meta.defaultBranch}</span>
        </span>
        <span aria-hidden="true" className="text-muted-foreground/40">
          ·
        </span>
        <span>
          <span className="text-muted-foreground/60">files:</span>{" "}
          <span className="tabular-nums text-foreground">
            {fileCount.toLocaleString()}
          </span>
        </span>
        <span aria-hidden="true" className="text-muted-foreground/40">
          ·
        </span>
        <span>
          <span className="text-muted-foreground/60">dirs:</span>{" "}
          <span className="tabular-nums text-foreground">
            {dirCount.toLocaleString()}
          </span>
        </span>
        <span aria-hidden="true" className="text-muted-foreground/40">
          ·
        </span>
        <span>
          <span className="text-muted-foreground/60">entries:</span>{" "}
          <span className="tabular-nums text-foreground">
            {totalEntries.toLocaleString()}
          </span>
        </span>
        <span aria-hidden="true" className="text-muted-foreground/40">
          ·
        </span>
        <span>
          <span className="text-muted-foreground/60">tree:</span>{" "}
          <span
            className={
              data.treeTruncated
                ? "text-amber-700 dark:text-amber-400"
                : "text-foreground"
            }
          >
            {data.treeTruncated ? "partial" : "complete"}
          </span>
        </span>
      </div>

      {data.tree.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/10 backdrop-blur-sm px-5 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Repository tree is empty or could not be retrieved.
          </p>
        </div>
      ) : (
        <>
        <OnboardingBriefCard
          meta={data.meta}
          projectType={data.projectType}
          onboarding={data.onboarding}
          owner={data.meta.owner}
          repo={data.meta.repo}
          branch={data.meta.defaultBranch}
        />
        <Tabs defaultValue="top">
          <TabsList className="grid h-9 max-w-xs grid-cols-2">
            <TabsTrigger value="top" className="gap-1.5 text-xs">
              <Star aria-hidden="true" className="h-3.5 w-3.5" />
              Top Files
              <span className="tabular-nums text-muted-foreground">
                ({data.topFiles.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="tree" className="gap-1.5 text-xs">
              <ListTree aria-hidden="true" className="h-3.5 w-3.5" />
              Full Tree
              <span className="tabular-nums text-muted-foreground">
                ({fileCount})
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="top">
            <TopFiles
              files={data.topFiles}
              owner={data.meta.owner}
              repo={data.meta.repo}
              branch={data.meta.defaultBranch}
            />
          </TabsContent>

          <TabsContent value="tree">
            <div className="overflow-hidden rounded-xl border border-border bg-card/10 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {dirCount} folders · {fileCount} files
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Top-ranked files highlighted
                </span>
              </div>
              <div className="max-h-[70vh] overflow-auto">
                <FileTree entries={data.tree} topFiles={data.topFiles} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        </>
      )}
    </>
  );
}
