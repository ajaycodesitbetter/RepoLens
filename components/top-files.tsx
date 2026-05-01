import { ArrowUpRight } from "lucide-react";
import { getFileIconInfo } from "@/lib/file-icons";
import { getFileReason } from "@/lib/file-reasons";
import { cn } from "@/lib/utils";
import type { TreeEntry } from "@/lib/types";

export function TopFiles({
  files,
  owner,
  repo,
  branch,
}: {
  files: TreeEntry[];
  owner: string;
  repo: string;
  branch: string;
}) {
  if (files.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card/10 backdrop-blur-sm px-5 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          No important files identified for this repository.
        </p>
      </div>
    );
  }

  const maxScore = Math.max(...files.map((f) => f.importanceScore), 1);

  return (
    <ol
      aria-label="Top files by importance"
      className="overflow-hidden rounded-xl border border-border bg-card/10 backdrop-blur-sm"
    >
      {files.map((file, i) => {
        const { Icon, colorClass } = getFileIconInfo(file.path);
        const filename = file.path.split("/").pop() ?? file.path;
        const segments = file.path.split("/");
        const dir = segments.length > 1 ? segments.slice(0, -1).join("/") : null;
        const depth = segments.length;
        const reason = getFileReason(file.path);
        const url = `https://github.com/${owner}/${repo}/blob/${branch}/${file.path}`;
        const scorePct = Math.round((file.importanceScore / maxScore) * 100);

        return (
          <li
            key={file.path}
            className={cn(
              "border-b border-border last:border-b-0",
              i === 0 && "bg-muted/20",
            )}
          >
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              {/* Rank number */}
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center font-mono text-[10px] font-medium tabular-nums text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Icon */}
              <Icon
                aria-hidden="true"
                className={cn("mt-0.5 h-4 w-4 shrink-0", colorClass)}
              />

              {/* Filename + path + reason */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="truncate font-mono text-sm font-semibold text-foreground">
                    {filename}
                  </span>
                  {reason && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {reason}
                    </span>
                  )}
                </div>
                {dir ? (
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    <span className="text-muted-foreground/60">depth {depth} ·</span>{" "}
                    {dir}/
                  </p>
                ) : (
                  <p className="font-mono text-[11px] text-muted-foreground">
                    <span className="text-muted-foreground/60">depth {depth} ·</span>{" "}
                    repo root
                  </p>
                )}
              </div>

              {/* Score + open arrow */}
              <div className="flex shrink-0 items-center gap-2">
                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono text-[10px] font-medium tabular-nums text-foreground">
                    {file.importanceScore}
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-1 w-12 overflow-hidden rounded-full bg-muted"
                  >
                    <span
                      className="block h-full rounded-full bg-amber-400"
                      style={{ width: `${scorePct}%` }}
                    />
                  </span>
                </div>
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-4 w-4 text-muted-foreground/60 transition-colors group-hover:text-primary"
                />
              </div>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
