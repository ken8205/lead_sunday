"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) {
      console.warn("[PostHog] NEXT_PUBLIC_POSTHOG_KEY is not set — analytics disabled");
      return;
    }
    if (process.env.NODE_ENV !== "production") {
      console.warn("[PostHog] Non-production environment — analytics disabled");
      return;
    }
    posthog.init(key, {
      api_host: "/ingest",
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false,
    });
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
