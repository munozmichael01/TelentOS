"use client";

import { useEffect } from "react";

export function TrackCareerEvent({
  companyId,
  eventType,
  jobId,
}: {
  companyId: string;
  eventType: "page_view" | "job_view" | "application";
  jobId?: string;
}) {
  useEffect(() => {
    fetch("/api/career-site/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: companyId, event_type: eventType, job_id: jobId }),
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
