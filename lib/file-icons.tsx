/**
 * Map a file path to a lucide icon and a subtle color tone for visual scanning.
 * Pure UI helper — no server logic.
 */
import {
  File,
  FileCode2,
  FileText,
  FileJson,
  Settings,
  BookOpen,
  Scale,
  Lock,
  Terminal,
  Palette,
  Image as ImageIcon,
  Container,
  Hammer,
  type LucideIcon,
} from "lucide-react";

export type FileIconInfo = {
  Icon: LucideIcon;
  colorClass: string;
};

const DEFAULT: FileIconInfo = {
  Icon: File,
  colorClass: "text-muted-foreground",
};

function getExt(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx > 0 ? name.slice(idx + 1).toLowerCase() : "";
}

export function getFileIconInfo(path: string): FileIconInfo {
  const name = path.split("/").pop() ?? path;
  const lower = name.toLowerCase();
  const ext = getExt(name);

  // Special filenames first.
  if (/^readme(\.|$)/i.test(name)) {
    return { Icon: BookOpen, colorClass: "text-purple-500" };
  }
  if (/^license(\.|$)/i.test(name)) {
    return { Icon: Scale, colorClass: "text-stone-500" };
  }
  if (lower === "dockerfile") {
    return { Icon: Container, colorClass: "text-sky-500" };
  }
  if (lower === "makefile") {
    return { Icon: Hammer, colorClass: "text-amber-600" };
  }
  if (
    lower === "pnpm-lock.yaml" ||
    lower === "package-lock.json" ||
    lower === "yarn.lock" ||
    lower === "cargo.lock" ||
    lower === "gemfile.lock" ||
    lower === "poetry.lock" ||
    lower.endsWith(".lock")
  ) {
    return { Icon: Lock, colorClass: "text-stone-500" };
  }
  if (lower === ".gitignore" || /^\.env(\.|$)/.test(lower)) {
    return { Icon: Settings, colorClass: "text-stone-500" };
  }
  if (/\.config\.(ts|js|mjs|cjs)$/.test(lower)) {
    return { Icon: Settings, colorClass: "text-stone-500" };
  }

  switch (ext) {
    case "md":
    case "mdx":
    case "rst":
    case "txt":
      return { Icon: FileText, colorClass: "text-purple-500" };
    case "json":
      return { Icon: FileJson, colorClass: "text-amber-600" };
    case "yaml":
    case "yml":
    case "toml":
    case "ini":
      return { Icon: Settings, colorClass: "text-stone-500" };
    case "ts":
    case "tsx":
      return { Icon: FileCode2, colorClass: "text-blue-500" };
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return { Icon: FileCode2, colorClass: "text-yellow-500" };
    case "py":
      return { Icon: FileCode2, colorClass: "text-green-500" };
    case "rs":
      return { Icon: FileCode2, colorClass: "text-orange-500" };
    case "go":
      return { Icon: FileCode2, colorClass: "text-cyan-500" };
    case "rb":
      return { Icon: FileCode2, colorClass: "text-red-500" };
    case "java":
    case "kt":
      return { Icon: FileCode2, colorClass: "text-orange-600" };
    case "swift":
      return { Icon: FileCode2, colorClass: "text-orange-500" };
    case "vue":
      return { Icon: FileCode2, colorClass: "text-emerald-500" };
    case "svelte":
      return { Icon: FileCode2, colorClass: "text-orange-500" };
    case "c":
    case "cpp":
    case "h":
    case "hpp":
    case "cs":
      return { Icon: FileCode2, colorClass: "text-indigo-500" };
    case "sh":
    case "bash":
    case "zsh":
    case "fish":
      return { Icon: Terminal, colorClass: "text-stone-500" };
    case "css":
    case "scss":
    case "sass":
    case "less":
      return { Icon: Palette, colorClass: "text-pink-500" };
    case "html":
    case "htm":
      return { Icon: FileCode2, colorClass: "text-orange-500" };
    case "svg":
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "ico":
    case "avif":
      return { Icon: ImageIcon, colorClass: "text-emerald-500" };
    default:
      return DEFAULT;
  }
}
