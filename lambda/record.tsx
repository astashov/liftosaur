import { h } from "preact";
import { IRecordResponse } from "../src/api/service";
import { RecordHtml } from "../src/pages/record/recordHtml";
import { renderPage } from "./render";
import { IStorage } from "../src/types";
import { IEither } from "../src/utils/types";
import { DateUtils } from "../src/utils/date";
import { Exercise } from "../src/models/exercise";
import { History } from "../src/models/history";
import { StringUtils } from "../src/utils/string";
import { Weight } from "../src/models/weight";
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
      date: DateUtils.format(historyRecord.date),
      exercises: historyRecord.entries.map((entry) => {
        const exercise = Exercise.get(entry.exercise, storage.settings.exercises);
        const prSet = History.findPersonalRecord(recordId, entry, history);
        const set = History.getMaxWeightSetFromEntry(entry);
        const value = `${set?.completedReps || 0} ${StringUtils.pluralize(
          "rep",
          set?.completedReps || 0
        )} x ${Weight.display(
          Weight.convertTo(set?.weight || Weight.build(0, storage.settings.units), storage.settings.units)
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
