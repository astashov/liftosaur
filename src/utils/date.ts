export namespace DateUtils {
  export function format(dateStr: string | Date | number, hideWeekday?: boolean, hideYear?: boolean): string {
    let date;
    if (typeof dateStr === "string") {
      date = new Date(Date.parse(dateStr));
    } else if (typeof dateStr === "number") {
      date = new Date(dateStr);
    } else {
      date = dateStr;
    }
    return date.toLocaleDateString(undefined, {
      weekday: !hideWeekday ? "short" : undefined,
      year: !hideYear ? "numeric" : undefined,
      month: "short",
      day: "numeric",
    });
  }

  export function formatWithTime(dateStr: string | Date | number): string {
    let date;
    if (typeof dateStr === "string") {
      date = new Date(Date.parse(dateStr));
    } else if (typeof dateStr === "number") {
      date = new Date(dateStr);
    } else {
      date = dateStr;
    }
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
  }

  export function formatYYYYMMDD(date: Date | string | number, separator: string = "-"): string {
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

    return [year, month, day].join(separator);
  }

  export function formatUTCYYYYMMDD(date: Date | string | number): string {
    const d = new Date(date);
    let month = `${d.getUTCMonth() + 1}`;
    let day = `${d.getUTCDate()}`;
    const year = `${d.getUTCFullYear()}`;

    if (month.length < 2) {
      month = `0${month}`;
    }
    if (day.length < 2) {
      day = `0${day}`;
    }

    return [year, month, day].join("-");
  }

  export function parseYYYYMMDDHHMM(dateStr: string): Date | undefined {
    const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
    if (match != null) {
      const [, year, month, day, hours, minutes, seconds] = match;
      return new Date(
        new Date(
          parseInt(year, 10),
          parseInt(month, 10) - 1,
          parseInt(day, 10),
          parseInt(hours, 10),
          parseInt(minutes, 10),
          parseInt(seconds, 10)
        )
      );
    }
    return undefined;
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
      month = `0${month}`;
    }
    if (day.length < 2) {
      day = `0${day}`;
    }

    return [year, month, day, hours, minutes, seconds].join("");
  }

  export function firstDayOfWeekTimestamp(date: Date | number, startWeekFromMonday?: boolean): number {
    const d = new Date(date);
    let weekDay = d.getDay();
    if (startWeekFromMonday && weekDay === 0) {
      weekDay = 7;
    }
    const currentDay = d.getDate();
    const beginningOfWeekDay = currentDay - weekDay + (startWeekFromMonday ? 1 : 0);
    const newDate = new Date(d.getFullYear(), d.getMonth(), beginningOfWeekDay);
    return newDate.getTime();
  }

  export function lastDayOfWeekTimestamp(date: Date | number, startWeekFromMonday?: boolean): number {
    const d = new Date(date);
    let weekDay = d.getDay();
    if (startWeekFromMonday && weekDay === 0) {
      weekDay = 7;
    }
    const currentDay = d.getDate();
    const endOfWeekDay = currentDay + (7 - weekDay) + (startWeekFromMonday ? 1 : 0);
    const newDate = new Date(d.getFullYear(), d.getMonth(), endOfWeekDay, 23, 59, 59);
    return newDate.getTime();
  }

  export function formatHHMMSS(date: Date | string | number, withMs: boolean = false): string {
    const d = new Date(date);
    let seconds = `${d.getSeconds()}`;
    let minutes = `${d.getMinutes()}`;
    let hours = `${d.getHours()}`;

    if (seconds.length < 2) {
      seconds = `0${seconds}`;
    }
    if (minutes.length < 2) {
      minutes = `0${minutes}`;
    }
    if (hours.length < 2) {
      hours = `0${hours}`;
    }
    let result = [hours, minutes, seconds].join(":");
    if (withMs) {
      result += `.${d.getMilliseconds()}`;
    }
    return result;
  }

  export function fromYYYYMMDD(dateStr: string, separator: string = "-"): string {
    const regexp = new RegExp(`^(\\d{4})${separator}(\\d{2})${separator}(\\d{2})$`);
    const regexpMatchArray = dateStr.match(regexp);
    if (regexpMatchArray) {
      const [, year, month, day] = regexpMatchArray;
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return date.toISOString();
    } else {
      return new Date(Date.UTC(1970, 1, 1)).toISOString();
    }
  }

  export function yearAndMonth(date: Date | string | number): [number, number] {
    const d = new Date(date);
    return [d.getUTCFullYear(), d.getUTCMonth()];
  }

  export function formatRange(start: Date | string | number, end: Date | string | number): string {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (startDate.getFullYear() !== endDate.getFullYear()) {
      return `${format(startDate, true)} - ${format(endDate, true)}`;
    } else {
      if (startDate.getMonth() !== endDate.getMonth()) {
        const formattedStart = startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        const formattedEnd = endDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        return `${formattedStart} - ${formattedEnd}, ${startDate.getFullYear()}`;
      } else {
        const month = startDate.toLocaleDateString(undefined, { month: "short" });
        return `${month} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`;
      }
    }
  }
}
