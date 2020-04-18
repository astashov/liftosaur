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

  export function formatYYYYMMDD(date: Date | string): string {
    const d = new Date(date);
    let month = `${d.getMonth() + 1}`;
    let day = `${d.getDate()}`;
    const year = `${d.getFullYear()}`;

    if (month.length < 2) {
      month = `0${month}`;
    }
    if (day.length < 2) {
      day = `0${day}`;
    }

    return [year, month, day].join("-");
  }

  export function fromYYYYMMDD(dateStr: string): string {
    const [, year, month, day] = dateStr.match(/^(\d+)-0*(\d+)-0*(\d+)$/)!;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    return date.toISOString();
  }
}
