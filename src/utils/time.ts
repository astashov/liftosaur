export namespace TimeUtils {
  export function formatHHMMSS(ms: number): string {
    let result = "";
    if (ms > 3600000) {
      const hours = Math.floor(ms / 3600000);
      result += `${hours}:`;
    }
    const minutes = Math.floor(ms / 60000);
    const seconds = (ms % 60000) / 1000;
    result +=
      seconds.toFixed(0) === "60" ? `${minutes + 1}:00` : `${minutes}:${seconds < 10 ? "0" : ""}${seconds.toFixed(0)}`;
    return result;
  }
}
