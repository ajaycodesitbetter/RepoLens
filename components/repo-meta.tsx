import { Star, GitFork, Code2, GitBranch, ExternalLink, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RepoMeta as RepoMetaType } from "@/lib/types";

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return Math.round(n / 1000) + "k";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function OwnerLocationLine({ meta }: { meta: RepoMetaType }) {
  const { ownerLocationRaw, ownerCountry, locationConfidence } = meta;

  // Three states per the spec:
  //   high/medium → "Inferred owner country: X"
  //   raw exists but unmappable → "Owner location could not be mapped to a country"
  //   no raw at all → "Owner location unavailable"
  let primary: string;
  let tone: "info" | "muted" = "muted";
  if (
    (locationConfidence === "high" || locationConfidence === "medium") &&
    ownerCountry
  ) {
    primary = `Inferred owner country: ${ownerCountry}`;
    tone = "info";
  } else if (ownerLocationRaw) {
    primary = "Owner location could not be mapped to a country";
  } else {
    primary = "Owner location unavailable";
  }

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="flex items-start gap-2">
        <MapPin
          aria-hidden="true"
          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
            tone === "info" ? "text-amber-600" : "text-muted-foreground"
          }`}
        />
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-[11px] font-medium leading-snug text-foreground">
            {primary}
            {locationConfidence === "medium" && (
              <span className="ml-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                · low certainty
              </span>
            )}
          </p>
          <p className="text-[10px] leading-snug text-muted-foreground">
            Based on the repository owner&rsquo;s public GitHub profile location
            {ownerLocationRaw && (
              <>
                {" "}
                (<span className="font-mono">{ownerLocationRaw}</span>)
              </>
            )}
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export function RepoMeta({ meta }: { meta: RepoMetaType }) {
  const repoUrl = `https://github.com/${meta.owner}/${meta.repo}`;
  return (
    <section
      aria-label="Repository metadata"
      className="rounded-xl border border-border bg-card/10 backdrop-blur-sm"
    >
      {/* Identity */}
      <div className="space-y-2 border-b border-border px-4 py-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {meta.isForked && (
            <Badge variant="secondary" className="text-[10px] font-mono uppercase tracking-wide">
              Fork
            </Badge>
          )}
          {meta.isMock && (
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50 text-[10px] font-mono uppercase tracking-wide text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            >
              Mock
            </Badge>
          )}
        </div>
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-baseline gap-1 font-mono text-base font-semibold leading-tight text-foreground hover:text-primary"
        >
          <span className="text-muted-foreground">{meta.owner}/</span>
          <span>{meta.repo}</span>
          <ExternalLink
            aria-hidden="true"
            className="h-3 w-3 self-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          />
        </a>
        {meta.description && (
          <p className="text-sm leading-snug text-muted-foreground">
            {meta.description}
          </p>
        )}
      </div>

      {/* Stats grid */}
      <dl className="grid grid-cols-2 divide-x divide-y divide-border [&>div]:px-4 [&>div]:py-3">
        <div className="border-t border-border">
          <dt className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <Star aria-hidden="true" className="h-3 w-3" />
            Stars
          </dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">
            {fmt(meta.stars)}
          </dd>
        </div>
        <div className="border-t border-border">
          <dt className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <GitFork aria-hidden="true" className="h-3 w-3" />
            Forks
          </dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">
            {fmt(meta.forks)}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <Code2 aria-hidden="true" className="h-3 w-3" />
            Language
          </dt>
          <dd className="mt-0.5 truncate font-mono text-sm font-semibold text-foreground">
            {meta.language ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <GitBranch aria-hidden="true" className="h-3 w-3" />
            Branch
          </dt>
          <dd className="mt-0.5 truncate font-mono text-sm font-semibold text-foreground">
            {meta.defaultBranch}
          </dd>
        </div>
      </dl>

      {/* Owner-country inference (always shown) */}
      <OwnerLocationLine meta={meta} />
    </section>
  );
}
