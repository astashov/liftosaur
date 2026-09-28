export interface IScreenshotsSim {
  udid: string;
  email: string;
  driverPort: number;
}

const firstDriverPort = 7001;

export function ScreenshotsPlan_driverPort(deviceIndex: number): number {
  return firstDriverPort + deviceIndex;
}

export interface IScreenshotsAssignment {
  sim: IScreenshotsSim;
  flows: string[];
}

export function ScreenshotsPlan_assign(flows: string[], sims: IScreenshotsSim[]): IScreenshotsAssignment[] {
  const assignments = sims.map((sim) => ({ sim, flows: [] as string[] }));
  flows.forEach((flow, index) => {
    assignments[index % sims.length].flows.push(flow);
  });
  return assignments.filter((a) => a.flows.length > 0);
}

const platformPrefixes = ["android-", "watch-"];

export function ScreenshotsPlan_splitRunKey(key: string): { prefix: string; flow: string } {
  const prefix = platformPrefixes.find((p) => key.startsWith(p)) ?? "";
  return { prefix, flow: key.slice(prefix.length) };
}

export function ScreenshotsPlan_ownsFile(prefix: string, fileName: string): boolean {
  return prefix === "" ? !platformPrefixes.some((p) => fileName.startsWith(p)) : fileName.startsWith(prefix);
}

export function ScreenshotsPlan_flowName(flowPath: string): string {
  return flowPath.replace(/^.*\//, "").replace(/\.(ya?ml|txt)$/, "");
}

export function ScreenshotsPlan_parseResults(maestroOutput: string): Record<string, "passed" | "failed"> {
  const results: Record<string, "passed" | "failed"> = {};
  for (const line of maestroOutput.split("\n")) {
    const match = line.match(/\[(Passed|Failed)\]\s+(\S+)/);
    if (match) {
      results[match[2].replace(/\.ya?ml$/, "")] = match[1] === "Passed" ? "passed" : "failed";
    }
  }
  return results;
}
