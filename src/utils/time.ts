export namespace TimeUtils {
  export function formatMMSS(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = (ms % 60000) / 1000;
    return seconds.toFixed(0) === "60"
      ? `${minutes + 1}:00`
      : `${minutes}:${seconds < 10 ? "0" : ""}${seconds.toFixed(0)}`;
  }
}
