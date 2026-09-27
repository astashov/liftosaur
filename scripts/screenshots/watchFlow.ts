export type IWatchStep =
  | { type: "launch"; bundleId: string }
  | { type: "wait"; ms: number }
  | { type: "tap"; x: number; y: number }
  | { type: "swipe"; from: [number, number]; to: [number, number] }
  | { type: "screenshot"; name: string };

const watchBundleId = "com.liftosaur.www.watchkitapp";

export function WatchFlow_parse(text: string): IWatchStep[] {
  const steps: IWatchStep[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) {
      continue;
    }
    const [command, ...args] = line.split(/\s+/);
    switch (command) {
      case "launch":
        steps.push({ type: "launch", bundleId: args[0] || watchBundleId });
        break;
      case "wait":
        steps.push({ type: "wait", ms: parseInt(args[0], 10) });
        break;
      case "tap":
        steps.push({ type: "tap", x: parseInt(args[0], 10), y: parseInt(args[1], 10) });
        break;
      case "swipe":
        steps.push({
          type: "swipe",
          from: [parseInt(args[0], 10), parseInt(args[1], 10)],
          to: [parseInt(args[2], 10), parseInt(args[3], 10)],
        });
        break;
      case "screenshot":
        steps.push({ type: "screenshot", name: args[0] });
        break;
      default:
        throw new Error(`Unknown watch flow command: ${line}`);
    }
  }
  return steps;
}
