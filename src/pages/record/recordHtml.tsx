import { h, JSX } from "preact";

// Overrides to make sure Graphs will render server-side
global.requestAnimationFrame = global.requestAnimationFrame || undefined;
global.document = global.document || undefined;
global.window = global.window || undefined;
global.devicePixelRatio = global.devicePixelRatio || 1;
global.navigator = global.navigator || { language: "en" };

import { IRecordResponse } from "../../api/service";
import { RecordContent } from "./recordContent";
import { Page } from "../../components/page";

export function RecordHtml({
  data,
  userId,
  recordId,
}: {
  data: IRecordResponse;
  userId: string;
  recordId: number;
}): JSX.Element {
  return (
    <Page
      css={["main", "record"]}
      js={["record"]}
      title="Workout summary"
      ogTitle="Liftosaur: Workout summary"
      ogDescription="Liftosaur Workout Summary - what exercises were done, with what sets, reps, weights, new personal records."
      ogUrl={`https://www.liftosaur.com/record?user=${userId}&id=${recordId}`}
      ogImage={`https://www.liftosaur.com/recordimage?user=${userId}&id=${recordId}`}
      data={data}
    >
      <RecordContent data={data} />
    </Page>
  );
}
