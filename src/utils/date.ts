export namespace DateUtils {
  export function format(dateStr: string | Date): string {
    let date;
    if (typeof dateStr === "string") {
      date = new Date(Date.parse(dateStr));
    } else {
      date = dateStr;
    }
    return date.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  }
}
