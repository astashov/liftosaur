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

  export function formatYYYYMMDD(date: Date | string | number): string {
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

  export function formatYYYYMMDDHHMM(date: Date | string | number): string {
    const d = new Date(date);
    let seconds = `${d.getSeconds()}`;
    let minutes = `${d.getMinutes()}`;
    let hours = `${d.getHours()}`;
    let day = `${d.getDate()}`;
    let month = `${d.getMonth() + 1}`;
    const year = `${d.getFullYear()}`;

    if (seconds.length < 2) {
      seconds = `0${seconds}`;
    }
    if (minutes.length < 2) {
      minutes = `0${minutes}`;
    }
    if (hours.length < 2) {
      hours = `0${hours}`;
    }
    if (month.length < 2) {
      month = `0${day}`;
    }
    if (day.length < 2) {
      day = `0${day}`;
    }

    return [year, month, day, hours, minutes, seconds].join("");
  }

  export function fromYYYYMMDD(dateStr: string): string {
    const [, year, month, day] = dateStr.match(/^(\d+)-0*(\d+)-0*(\d+)$/)!;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    return date.toISOString();
  }
}
