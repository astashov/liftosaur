import posthog from "posthog-js";

const apikey = "phc_BYLzuXpVzIfG1lJ8YgOI19UePVjeOdKdqNvUyjnPT1K";

export function lg(action: string): void {
  posthog.capture(action);
}

export function setupAppPosthog(): void {
  posthog.init(apikey, {
    api_host: "https://us.i.posthog.com",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    persistence: "memory",
    person_profiles: "identified_only",
  });
}

export function setupPagePosthog(): void {
  posthog.init(apikey, {
    api_host: "https://us.i.posthog.com",
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "memory",
    person_profiles: "identified_only",
  });
}

export function identifyPosthog(id: string, email?: string): void {
  const props: Record<string, string> = {};
  if (typeof window !== "undefined" && window.localStorage) {
    const source = window.localStorage.getItem("source");
    if (source) {
      props.source = source;
    }
  }
  if (email) {
    props.email = email;
  }
  posthog.identify(id, props);
}
