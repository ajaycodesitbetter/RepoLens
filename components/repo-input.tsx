"use client";

import * as React from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RepoInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  autoFocus?: boolean;
}

export function RepoInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  autoFocus,
}: RepoInputProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit();
      }}
      className="flex flex-1 gap-2 max-w-2xl"
      role="search"
      aria-label="GitHub repository"
    >
      <div className="relative flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
        />
        <Input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="owner/repo  or  github.com/owner/repo"
          aria-label="GitHub repository URL or owner/repo"
          autoFocus={autoFocus}
          className="pl-9 font-mono"
        />
      </div>
      <Button type="submit" disabled={!value.trim() || isLoading}>
        {isLoading ? (
          <>
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            <span className="sr-only">Loading</span>
          </>
        ) : (
          "Explore"
        )}
      </Button>
    </form>
  );
}
