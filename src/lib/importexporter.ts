import { IStorage } from "../types";
import { DateUtils } from "../utils/date";

export namespace ImportExporter {
  export function exportStorage(storage: IStorage): void {
    const string = JSON.stringify(storage, null, 2);
    const blob = new Blob([string], { type: "text/plain" });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.setAttribute("download", `liftosaur-${DateUtils.formatYYYYMMDD(Date.now())}.json`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  export function importStorage(storage: string): void {
    const string = JSON.stringify(storage, null, 2);
    const blob = new Blob([string], { type: "text/plain" });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.setAttribute("download", `liftosaur-${DateUtils.formatYYYYMMDD(Date.now())}.json`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
