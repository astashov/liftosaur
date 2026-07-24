export type IHearAboutUsSource =
  | "reddit"
  | "ai"
  | "friend"
  | "program"
  | "search"
  | "appstore"
  | "youtube"
  | "ad"
  | "other";

export interface IHearAboutUsChip {
  value: string;
  label: string;
  variant?: "coral";
  icon?: "speaker";
}

export type IHearAboutUsDrill =
  | { kind: "chips"; title: string; sub: string; chips: IHearAboutUsChip[]; freeformPlaceholder?: string }
  | { kind: "freeform"; title: string; sub: string; placeholder: string; allowEmpty?: boolean }
  | { kind: "none" };

export interface IHearAboutUsOption {
  source: IHearAboutUsSource;
  label: string;
  eyebrow: string;
  drill: IHearAboutUsDrill;
}

// Fixed, intentional order (no randomization); "other" is always last.
export const HEAR_ABOUT_US_OPTIONS: IHearAboutUsOption[] = [
  {
    source: "reddit",
    label: "Reddit",
    eyebrow: "You found us on Reddit",
    drill: {
      kind: "chips",
      title: "Which subreddit?",
      sub: "Optional - tap one, or type it in.",
      chips: [
        { value: "r/gzcl", label: "r/gzcl" },
        { value: "r/workout", label: "r/workout" },
        { value: "r/naturalbodybuilding", label: "r/naturalbodybuilding" },
        { value: "r/AverageToSavage", label: "r/AverageToSavage" },
        { value: "r/tacticalbarbell", label: "r/tacticalbarbell" },
        { value: "r/liftosaur", label: "r/liftosaur" },
        { value: "reddit-ad", label: "It was a Reddit ad", variant: "coral", icon: "speaker" },
      ],
      freeformPlaceholder: "Type a subreddit...",
    },
  },
  {
    source: "ai",
    label: "Asked AI",
    eyebrow: "An AI recommended us",
    drill: {
      kind: "chips",
      title: "Which AI?",
      sub: "Optional - tap one, or type it in.",
      chips: [
        { value: "ChatGPT", label: "ChatGPT" },
        { value: "Claude", label: "Claude" },
        { value: "Gemini", label: "Gemini" },
        { value: "Perplexity", label: "Perplexity" },
        { value: "Copilot", label: "Copilot" },
        { value: "Grok", label: "Grok" },
      ],
      freeformPlaceholder: "Another AI...",
    },
  },
  {
    source: "program",
    label: "Googled a program",
    eyebrow: "Specific program",
    drill: {
      kind: "chips",
      title: "Which program?",
      sub: "Tap the one that brought you here.",
      chips: [
        { value: "GZCL", label: "GZCL" },
        { value: "RP Hypertrophy", label: "RP Hypertrophy" },
        { value: "5/3/1", label: "5/3/1" },
        { value: "Tactical Barbell", label: "Tactical Barbell" },
        { value: "Arnold split", label: "Arnold split" },
        { value: "Mentzer", label: "Mentzer" },
      ],
      freeformPlaceholder: "Type a program...",
    },
  },
  {
    source: "friend",
    label: "Friend or family",
    eyebrow: "Friend or family",
    drill: { kind: "none" },
  },
  {
    source: "search",
    label: "Web search",
    eyebrow: "You searched the web",
    drill: {
      kind: "freeform",
      title: "What were you searching for?",
      sub: "Optional - roughly what you typed.",
      placeholder: "e.g. customizable workout tracker...",
    },
  },
  {
    source: "appstore",
    label: "App Store / Play Store",
    eyebrow: "You found us in the store",
    drill: { kind: "none" },
  },
  {
    source: "youtube",
    label: "YouTube",
    eyebrow: "You found us on YouTube",
    drill: {
      kind: "freeform",
      title: "Remember which video or channel?",
      sub: "Optional - type it in.",
      placeholder: "Channel or video...",
    },
  },
  {
    source: "ad",
    label: "Ads",
    eyebrow: "You saw an ad",
    drill: {
      kind: "chips",
      title: "Where?",
      sub: "Tap where you saw it.",
      chips: [
        { value: "Google", label: "Google" },
        { value: "Reddit", label: "Reddit" },
      ],
      freeformPlaceholder: "Somewhere else...",
    },
  },
  {
    source: "other",
    label: "Other",
    eyebrow: "Something else",
    drill: {
      kind: "freeform",
      title: "How did you hear about us?",
      sub: "Tell us in your own words.",
      placeholder: "Type here…",
    },
  },
];

export function HearAboutUs_option(source: IHearAboutUsSource): IHearAboutUsOption | undefined {
  return HEAR_ABOUT_US_OPTIONS.find((o) => o.source === source);
}
