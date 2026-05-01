/**
 * GET /api/repo?url=<string>
 * See docs/ARCHITECTURE.md → "API contract".
 */
import "server-only";

import { NextResponse } from "next/server";
import { getBriefForUrl } from "@/lib/github/service";
import type { ApiError, BriefResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  request: Request,
): Promise<NextResponse<BriefResponse | ApiError>> {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json<ApiError>(
      { error: "Missing required query param `url`." },
      { status: 400 },
    );
  }

  const result = await getBriefForUrl(url);

  if (!result.ok) {
    return NextResponse.json<ApiError>({ error: result.error }, { status: result.status });
  }

  return NextResponse.json<BriefResponse>(result.data, { status: 200 });
}
