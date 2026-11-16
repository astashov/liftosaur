import { IDI } from "./di";

export async function Bounded_run<T>(
  di: IDI,
  label: string,
  timeoutMs: number,
  work: () => Promise<T>
): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<{ kind: "timeout" }>((resolve) => {
    timer = setTimeout(() => resolve({ kind: "timeout" }), timeoutMs);
  });
  try {
    const outcome = await Promise.race([work().then((value) => ({ kind: "done" as const, value })), timeout]);
    if (outcome.kind === "timeout") {
      di.log.log(`${label} took over ${timeoutMs}ms`);
      return undefined;
    }
    return outcome.value;
  } catch (e) {
    di.log.log(`${label} failed`, e);
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}
