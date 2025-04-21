import { h, JSX } from "preact";
import "../../models/state";
import { DateUtils } from "../../utils/date";
import { IRecordResponse } from "../../api/service";
import { Weight } from "../../models/weight";
import { Reps } from "../../models/set";
import { Exercise } from "../../models/exercise";
import { StringUtils } from "../../utils/string";
import { GraphExercise } from "../../components/graphExercise";
import { History } from "../../models/history";
import { IHistoryRecord, IHistoryEntry, ISettings, ISet, IUnit } from "../../types";

interface IProps {
  data: IRecordResponse;
}

export function RecordContent(props: IProps): JSX.Element {
  const { record } = props.data;
  return (
    <section className="px-4 text-gray-900">
      <div className="px-4">
        <h2 className="text-xl font-bold">
          {record.programName}, {record.dayName}
        </h2>
        <p className="text-sm text-gray-600">{DateUtils.format(record.date)}</p>
      </div>
      <PersonalRecords data={props.data} />
      <MaxWeights data={props.data} />
      <ul>
        {record.entries.map((entry) => (
          <li>
            <Entry recordId={record.id} entry={entry} history={props.data.history} settings={props.data.settings} />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface IPersonalRecordsProps {
  data: IRecordResponse;
}

function PersonalRecords(props: IPersonalRecordsProps): JSX.Element | null {
  const { history, record } = props.data;
  const prs = History.findAllPersonalRecords(record, history);

  if (prs.size > 0) {
    return (
      <section className="p-4 my-6 bg-orange-100 border border-orange-800 rounded-lg">
        <h3 className="text-lg font-bold" dangerouslySetInnerHTML={{ __html: "&#x1F3C6 New Personal Records" }} />
        <ul>
          {Array.from(prs.keys()).map((exerciseType) => {
            const set = prs.get(exerciseType)!;
            const exercise = Exercise.get(exerciseType, props.data.settings.exercises);
            return (
              <li>
                <strong>{exercise.name}</strong>: <SetView set={set} units={props.data.settings.units} />
              </li>
            );
          })}
        </ul>
      </section>
    );
  } else {
    return null;
  }
}

interface IMaxWeightsProps {
  data: IRecordResponse;
}

function MaxWeights(props: IMaxWeightsProps): JSX.Element {
  return (
    <section className="px-4 my-6">
      <h3
        className="text-lg font-bold"
        dangerouslySetInnerHTML={{ __html: "&#x1F3CB Max lifted weights at the workout" }}
      />
      <ul>
        {props.data.record.entries
          .filter((e) => (History.getMaxWeightSetFromEntry(e)?.completedReps || 0) > 0)
          .map((entry) => {
            const exercise = Exercise.get(entry.exercise, props.data.settings.exercises);
            const set = History.getMaxWeightSetFromEntry(entry)!;
            return (
              <li>
                <strong>{exercise.name}</strong>: <SetView set={set} units={props.data.settings.units} />
              </li>
            );
          })}
      </ul>
    </section>
  );
}

interface IEntryProps {
  history: IHistoryRecord[];
  recordId: number;
  entry: IHistoryEntry;
  settings: ISettings;
}

function Entry(props: IEntryProps): JSX.Element {
  const units = props.settings.units;
  const exercise = Exercise.get(props.entry.exercise, props.settings.exercises);
  const prSet = History.findPersonalRecord(props.recordId, props.entry, props.history);
  const setGroups = Reps.group(props.entry.sets);

  const totalWeight = History.totalEntryWeight(props.entry, props.settings.units);
  const totalReps = History.totalEntryReps(props.entry);

  return (
    <section className="p-4 my-2 bg-gray-100 border border-gray-600 rounded-lg">
      <h4 className="text-lg font-bold">{exercise.name}</h4>
      <div class="flex flex-col sm:flex-row">
        <div class="flex-1">
          {prSet != null && (
            <div className="my-2 text-lg">
              <strong>🏆 New Personal Record</strong>: <SetView set={prSet} units={units} />
            </div>
          )}
          <p>Completed sets x reps x weight</p>
          <ul>
            {setGroups
              .filter((group) => (group[0]?.completedReps || 0) > 0)
              .map((group) => {
                let line: string;
                if (group.length > 1) {
                  line = `${group.length} x ${group[0].completedReps ?? 0} x ${Weight.display(group[0].completedWeight ?? Weight.build(0, units))}`;
                } else {
                  line = `${group[0].completedReps} x ${Weight.display(group[0].completedWeight ?? Weight.build(0, units))}`;
                }
                return <li>{line}</li>;
              })}
          </ul>
          <div className="mt-4">
            <p>
              <strong>Total Weight</strong>: {Weight.display(totalWeight)}
            </p>
            <p>
              <strong>Total reps</strong>: {totalReps}
            </p>
          </div>
        </div>
        <div className="record-graph">
          <GraphExercise
            isWithOneRm={true}
            isWithProgramLines={true}
            isSameXAxis={false}
            minX={0}
            maxX={0}
            history={props.history}
            exercise={props.entry.exercise}
            settings={props.settings}
          />
        </div>
      </div>
    </section>
  );
}

interface ISetProps {
  set: ISet;
  units: IUnit;
}

function SetView({ set, units }: ISetProps): JSX.Element {
  return (
    <span className="whitespace-nowrap">
      {set.completedReps || 0} {StringUtils.pluralize("rep", set.completedReps || 0)} x{" "}
      {Weight.display(Weight.convertTo(set.completedWeight ?? Weight.build(0, units), units))}
    </span>
  );
}
