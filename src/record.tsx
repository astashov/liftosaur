import { h } from "preact";
import { RecordContent } from "./pages/record/recordContent";
import { IRecordResponse } from "./api/service";
import { HydrateUtils } from "./utils/hydrate";

function main(): void {
  HydrateUtils.hydratePage<IRecordResponse>((data) => <RecordContent data={data} />);
}

main();
