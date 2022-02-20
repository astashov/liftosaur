import { IStorage } from "../types";
import { DateUtils } from "../utils/date";
import { Exporter } from "../utils/exporter";

export namespace ImportExporter {
  export function exportStorage(storage: IStorage): void {
    Exporter.toFile(`liftosaur-${DateUtils.formatYYYYMMDD(Date.now())}.json`, JSON.stringify(storage, null, 2));
  }
}
