export class DateUtils {
  public static formatYYYYMMDD(date: Date | string | number, joiner: string = ""): string {
    const d = new Date(date);
    let day = `${d.getDate()}`;
    let month = `${d.getMonth() + 1}`;
    const year = `${d.getFullYear()}`;

    if (month.length < 2) {
      month = `0${day}`;
    }
    if (day.length < 2) {
      day = `0${day}`;
    }

    return [year, month, day].join(joiner);
  }

  public static formatHHMMSS(date: Date | string | number, joiner: string = ""): string {
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

    return [hours, minutes, seconds].join(joiner);
  }
}
