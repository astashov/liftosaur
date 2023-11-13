import { h, JSX } from "preact";

import { IRecordResponse } from "../../api/service";
import { RecordContent } from "./recordContent";
import { Page } from "../../components/page";

export function RecordHtml({
  data,
  userId,
  recordId,
  client,
}: {
  data: IRecordResponse;
  userId: string;
  recordId: number;
  client: Window["fetch"];
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
      client={client}
    >
      <RecordContent data={data} />
    </Page>
  );
}
