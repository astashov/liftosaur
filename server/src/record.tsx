import render from "preact-render-to-string";
import { h } from "preact";
import { RecordHtml } from "../../src/record/recordHtml";
import { IRecordResponse } from "../../src/api/service";

export function renderRecordHtml(data: IRecordResponse): string {
  return "<!DOCTYPE html>" + render(<RecordHtml data={data} />);
}
