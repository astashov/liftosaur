export interface IProgressiveRevealInput {
  count: number;
  total: number;
  batchSize: number;
  threshold: number;
  rateLimitMs: number;
  lastBumpAt: number;
  now: number;
  offsetY: number;
  viewportHeight: number;
  contentHeight: number;
}

export type IProgressiveRevealStep =
  | { kind: "none" }
  | { kind: "bump"; count: number }
  | { kind: "retry"; inMs: number };

export function ProgressiveReveal_onScroll(input: IProgressiveRevealInput): IProgressiveRevealStep {
  if (input.count >= input.total) {
    return { kind: "none" };
  }
  if (input.offsetY + input.viewportHeight <= input.contentHeight - input.threshold) {
    return { kind: "none" };
  }
  const elapsed = input.now - input.lastBumpAt;
  if (elapsed < input.rateLimitMs) {
    return { kind: "retry", inMs: input.rateLimitMs - elapsed };
  }
  return { kind: "bump", count: Math.min(input.count + input.batchSize, input.total) };
}
