import { Compass, FileText, FolderTree, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyBriefButton } from "@/components/copy-brief-button";
import type { OnboardingBrief, ProjectType, RepoMeta } from "@/lib/types";

const CONFIDENCE_STYLES: Record<ProjectType["confidence"], string> = {
  high: "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300",
  medium:
    "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300",
  low: "bg-muted text-muted-foreground ring-1 ring-border",
};

export function OnboardingBriefCard({
  meta,
  projectType,
  onboarding,
  owner,
  repo,
  branch,
}: {
  meta: RepoMeta;
  projectType: ProjectType | null;
  onboarding: OnboardingBrief;
  owner: string;
  repo: string;
  branch: string;
}) {
  const hasReadingList = onboarding.readingList.length > 0;
  const hasDirs = onboarding.importantDirs.length > 0;
  // If we genuinely have nothing useful, hide the card entirely.
  if (!projectType && !hasReadingList && !hasDirs) return null;

  return (
    <section
      aria-label="Developer onboarding brief"
      className="overflow-hidden rounded-xl border border-border bg-card/10 backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <Sparkles
          aria-hidden="true"
          className="h-3.5 w-3.5 text-amber-500"
        />
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          onboarding brief
        </h2>
        <span
          aria-hidden="true"
          className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60"
        >
          heuristic · no AI
        </span>
        <CopyBriefButton
          meta={meta}
          projectType={projectType}
          onboarding={onboarding}
          branch={branch}
        />
      </div>

      {/* Project type */}
      {projectType ? (
        <div className="border-b border-border px-4 py-3">
          <div className="mb-1.5 flex items-center gap-2">
            <Compass
              aria-hidden="true"
              className="h-3.5 w-3.5 text-muted-foreground"
            />
            <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Likely project type
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-foreground">
              {projectType.label}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                CONFIDENCE_STYLES[projectType.confidence],
              )}
            >
              {projectType.confidence} confidence
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            <span className="text-muted-foreground/70">why:</span>{" "}
            <span className="font-mono">{projectType.reason}</span>
          </p>
          <p className="mt-1 text-xs text-foreground/80">{projectType.hint}</p>
        </div>
      ) : (
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            No clear framework signature — couldn’t infer the project type from
            the file tree alone.
          </p>
        </div>
      )}

      {/* Reading list */}
      {hasReadingList && (
        <div className="border-b border-border px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <FileText
              aria-hidden="true"
              className="h-3.5 w-3.5 text-muted-foreground"
            />
            <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Start reading here
            </h3>
          </div>
          <ol className="space-y-1.5">
            {onboarding.readingList.map((item) => {
              const url = `https://github.com/${owner}/${repo}/blob/${branch}/${item.path}`;
              const filename = item.path.split("/").pop() ?? item.path;
              const dir =
                item.path.includes("/")
                  ? item.path.slice(0, item.path.lastIndexOf("/"))
                  : null;
              return (
                <li key={item.path}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 rounded-md border border-transparent px-2 py-1.5 transition-colors hover:border-border hover:bg-muted/40"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[10px] font-semibold tabular-nums text-foreground">
                      {item.order}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-mono text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                          {filename}
                        </span>
                        {dir && (
                          <span className="truncate font-mono text-[10px] text-muted-foreground">
                            {dir}/
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {item.reason}
                      </p>
                    </div>
                  </a>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Important directories */}
      {hasDirs && (
        <div className="px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <FolderTree
              aria-hidden="true"
              className="h-3.5 w-3.5 text-muted-foreground"
            />
            <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Where to look
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {onboarding.importantDirs.map((dir) => (
              <span
                key={dir}
                className="rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground"
              >
                {dir}/
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Top-level directories (by file count) where most of the
            implementation lives.
          </p>
        </div>
      )}
    </section>
  );
}
