import { h } from "preact";
import { IRecordResponse } from "../src/api/service";
import { RecordHtml } from "../src/pages/record/recordHtml";
import { renderPage } from "./render";
import { IStorage } from "../src/types";
import { IEither } from "../src/utils/types";
import { DateUtils_format } from "../src/utils/date";
import { Exercise_get } from "../src/models/exercise";
import { History_findPersonalRecord, History_getMaxWeightSetFromEntry } from "../src/models/history";
import { StringUtils_pluralize } from "../src/utils/string";
import { Weight_display, Weight_convertTo, Weight_build } from "../src/models/weight";
import { RecordImageGenerator, IRecordImageGeneratorArgs } from "./utils/recordImageGenerator";

export function renderRecordHtml(
  client: Window["fetch"],
  data: IRecordResponse,
  userId: string,
  recordId: number
): string {
  return renderPage(<RecordHtml client={client} data={data} userId={userId} recordId={recordId} />);
}

export async function recordImage(storage: IStorage, recordId: number): Promise<IEither<Buffer, string>> {
  const history = storage.history;
  const historyRecord = history.find((hi) => hi.id === recordId);
  if (historyRecord != null) {
    const json: IRecordImageGeneratorArgs = {
      programName: historyRecord.programName,
      dayName: historyRecord.dayName,
      date: DateUtils_format(historyRecord.date),
      exercises: historyRecord.entries.map((entry) => {
        const exercise = Exercise_get(entry.exercise, storage.settings.exercises);
        const prSet = History_findPersonalRecord(recordId, entry, history);
        const set = History_getMaxWeightSetFromEntry(entry);
        const value = `${set?.completedReps || 0} ${StringUtils_pluralize(
          "rep",
          set?.completedReps || 0
        )} x ${Weight_display(
          Weight_convertTo(set?.weight || Weight_build(0, storage.settings.units), storage.settings.units)
        )}`;
        return {
          name: exercise.name,
          value,
          pr: !!prSet,
        };
      }),
    };

    const generator = new RecordImageGenerator();
    return { success: true, data: await generator.generate(json) };
  } else {
    return { success: false, error: `Missing history record with given id ${recordId}` };
  }
}
