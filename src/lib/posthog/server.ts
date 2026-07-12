import { PostHog } from "posthog-node";

let client: PostHog | null = null;

export function getPostHogServerClient() {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null;
  if (process.env.NODE_ENV !== "production") return null;

  if (!client) {
    client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return client;
}
