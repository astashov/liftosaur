export const Reactions_all = [
  "dino_flex",
  "dino_fire",
  "dino_pr",
  "dino_hype",
  "dino_heart",
  "dino_gomad",
  "dino_thumbsup",
  "dino_omg",
  "dino_hug2",
] as const;

export type IReaction = (typeof Reactions_all)[number];

export interface IReactionRow {
  ownerId: string;
  recordId: number;
  reactorId: string;
  reaction: IReaction;
  createdAt: number;
}

export interface IReactor {
  userId: string;
  nickname?: string;
}

export interface IReactionSummary {
  counts: Partial<Record<IReaction, number>>;
  mine?: IReaction;
  reactors: IReactor[];
  total: number;
}

export function Reactions_imagePath(reaction: IReaction): string {
  return `/images/reactions/${reaction}.png`;
}

export function Reactions_reactorsLine(summary: IReactionSummary, shown: number = 2): string {
  const names = summary.reactors.slice(0, shown).map((r) => r.nickname || "a lifter");
  const others = summary.total - names.length;
  if (others <= 0) {
    return names.length === 2 ? `${names[0]} & ${names[1]}` : names.join(", ");
  }
  return `${names.join(", ")} & ${others} ${others === 1 ? "other" : "others"}`;
}

export function Reactions_isReaction(value: unknown): value is IReaction {
  return typeof value === "string" && (Reactions_all as readonly string[]).includes(value);
}

export function Reactions_empty(): IReactionSummary {
  return { counts: {}, reactors: [], total: 0 };
}

export function Reactions_summarize(
  rows: IReactionRow[],
  viewerId: string,
  nicknames: Partial<Record<string, string>>
): IReactionSummary {
  const sorted = [...rows].sort((a, b) => b.createdAt - a.createdAt);
  const counts: Partial<Record<IReaction, number>> = {};
  let mine: IReaction | undefined;
  for (const row of sorted) {
    counts[row.reaction] = (counts[row.reaction] || 0) + 1;
    if (row.reactorId === viewerId) {
      mine = row.reaction;
    }
  }
  const reactors = sorted.map((row) => ({ userId: row.reactorId, nickname: nicknames[row.reactorId] }));
  return { counts, mine, reactors, total: sorted.length };
}

export function Reactions_applyMine(
  summary: IReactionSummary | undefined,
  viewer: IReactor,
  next: IReaction | undefined
): IReactionSummary {
  const base = summary ?? Reactions_empty();
  const counts = { ...base.counts };
  const previous = base.mine;
  if (previous != null) {
    const left = (counts[previous] || 0) - 1;
    if (left > 0) {
      counts[previous] = left;
    } else {
      delete counts[previous];
    }
  }
  if (next != null) {
    counts[next] = (counts[next] || 0) + 1;
  }
  const others = base.reactors.filter((r) => r.userId !== viewer.userId);
  const reactors = next != null ? [viewer, ...others] : others;
  return { counts, mine: next, reactors, total: reactors.length };
}

export function Reactions_ordered(summary: IReactionSummary): { reaction: IReaction; count: number }[] {
  return Reactions_all.filter((r) => (summary.counts[r] || 0) > 0).map((reaction) => ({
    reaction,
    count: summary.counts[reaction] || 0,
  }));
}
