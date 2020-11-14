import { ObjectUtils } from "../../../src/utils/object";
import { migrations } from "./migrations";

export async function runMigrations(): Promise<void> {
  const versions = ObjectUtils.keys(migrations);
  for (const version of versions) {
    await migrations[version]();
  }
}
