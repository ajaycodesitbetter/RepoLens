"use client";

import * as React from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getFileIconInfo } from "@/lib/file-icons";
import type { TreeEntry } from "@/lib/types";

type Node = {
  name: string;
  path: string;
  type: "blob" | "tree";
  size: number | null;
  importanceScore: number;
  children: Node[];
};

function buildNodes(entries: TreeEntry[]): Node[] {
  const sorted = [...entries].sort((a, b) => {
    if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  const map = new Map<string, Node>();
  const roots: Node[] = [];

  for (const e of sorted) {
    const parts = e.path.split("/");
    const node: Node = {
      name: parts[parts.length - 1]!,
      path: e.path,
      type: e.type,
      size: e.size,
      importanceScore: e.importanceScore,
      children: [],
    };
    map.set(e.path, node);

    if (parts.length === 1) {
      roots.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join("/");
      const parent = map.get(parentPath);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }
  return roots;
}

function formatSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Row({
  node,
  depth,
  importantSet,
}: {
  node: Node;
  depth: number;
  importantSet: Set<string>;
}) {
  const [open, setOpen] = React.useState(depth < 2);
  const isDir = node.type === "tree";
  const isImportant = importantSet.has(node.path);
  const fileIcon = !isDir ? getFileIconInfo(node.path) : null;
  const FileIcon = fileIcon?.Icon;

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1.5 rounded-md py-0.5 pr-2 text-sm transition-colors",
          isDir ? "cursor-pointer hover:bg-muted/60" : "hover:bg-muted/40",
          isImportant && !isDir && "bg-amber-50/40 dark:bg-amber-950/10",
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => isDir && setOpen((v) => !v)}
        role={isDir ? "button" : undefined}
        aria-expanded={isDir ? open : undefined}
        tabIndex={isDir ? 0 : -1}
        onKeyDown={(e) => {
          if (isDir && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <span
          aria-hidden="true"
          className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-muted-foreground"
        >
          {isDir ? (
            open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )
          ) : null}
        </span>

        {isDir ? (
          open ? (
            <FolderOpen aria-hidden="true" className="h-4 w-4 shrink-0 text-amber-500" />
          ) : (
            <Folder aria-hidden="true" className="h-4 w-4 shrink-0 text-amber-500" />
          )
        ) : (
          FileIcon && (
            <FileIcon
              aria-hidden="true"
              className={cn("h-4 w-4 shrink-0", fileIcon.colorClass)}
            />
          )
        )}

        <span
          className={cn(
            "min-w-0 flex-1 truncate font-mono text-[13px] leading-tight",
            isImportant && !isDir
              ? "font-semibold text-foreground"
              : isDir
                ? "text-foreground"
                : "text-foreground/85",
          )}
        >
          {node.name}
          {isDir && <span className="text-muted-foreground">/</span>}
        </span>

        {isImportant && !isDir && node.importanceScore > 0 && (
          <span
            title={`Importance score: ${node.importanceScore}`}
            className="shrink-0 rounded border border-amber-200 bg-amber-50 px-1.5 py-0 font-mono text-[10px] font-medium tabular-nums text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300"
          >
            {node.importanceScore}
          </span>
        )}

        {!isDir && node.size != null && (
          <span className="hidden shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:inline">
            {formatSize(node.size)}
          </span>
        )}
      </div>

      {isDir && open && node.children.length > 0 && (
        <ul>
          {node.children.map((c) => (
            <Row
              key={c.path}
              node={c}
              depth={depth + 1}
              importantSet={importantSet}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function FileTree({
  entries,
  topFiles,
}: {
  entries: TreeEntry[];
  topFiles: TreeEntry[];
}) {
  const tree = React.useMemo(() => buildNodes(entries), [entries]);
  const importantSet = React.useMemo(
    () => new Set(topFiles.map((f) => f.path)),
    [topFiles],
  );

  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No files found in this repository.
      </p>
    );
  }

  return (
    <ul className="py-1">
      {tree.map((n) => (
        <Row key={n.path} node={n} depth={0} importantSet={importantSet} />
      ))}
    </ul>
  );
}
