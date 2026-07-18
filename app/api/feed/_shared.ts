import { NextResponse } from "next/server";
import { buildJobsFeed, type JobsFeedFormat } from "@/lib/feed/jobs-feed";
import { fetchActiveFeedJobs } from "@/lib/feed/source";
import { createClient } from "@/lib/supabase/server";

export async function feedResponse(req: Request, format: JobsFeedFormat) {
  try {
    const origin = new URL(req.url).origin;
    const jobs = await fetchActiveFeedJobs(createClient(), origin);
    const body = buildJobsFeed(jobs, format);

    return new NextResponse(body, {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, s-maxage=300, stale-while-revalidate=900",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to build jobs feed" },
      { status: 500 }
    );
  }
}
