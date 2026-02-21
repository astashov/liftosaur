import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { IProgram, ISettings } from "../types";
import { useState } from "preact/compat";
import {
  builtinProgramAges,
  builtinProgramAgesKeys,
  builtinProgramDurations,
  builtinProgramDurationsKeys,
  builtinProgramFrequencies,
  builtinProgramGoals,
  IBuiltinProgramAge,
  IBuiltinProgramDuration,
  IBuiltinProgramFrequency,
  IBuiltinProgramGoal,
} from "../models/builtinPrograms";
import { SelectLink } from "./selectLink";
import { ExerciseImageUtils } from "../models/exerciseImage";
import { IProgramIndexEntry, Program } from "../models/program";
import { StringUtils } from "../utils/string";
import { Tailwind } from "../utils/tailwindConfig";
import { ExerciseImage } from "./exerciseImage";
import { IconCalendarSmall } from "./icons/iconCalendarSmall";
import { IconKettlebellSmall } from "./icons/iconKettlebellSmall";
import { IconWatch } from "./icons/iconWatch";
import { ModalProgramInfo } from "./modalProgramInfo";
import { Thunk } from "../ducks/thunks";
import { equipmentName } from "../models/exercise";
import { Equipment } from "../models/equipment";
import { Settings } from "../models/settings";
import { Markdown } from "./markdown";

interface IProps {
  programs: IProgram[];
  programsIndex: IProgramIndexEntry[];
  hasCustomPrograms: boolean;
  settings: ISettings;
  dispatch: IDispatch;
}

interface IFilter {
  age?: IBuiltinProgramAge;
  duration?: IBuiltinProgramDuration;
  frequency?: IBuiltinProgramFrequency;
  goal?: IBuiltinProgramGoal;
}

export function BuiltinProgramsList(props: IProps): JSX.Element {
  const [filter, setFilter] = useState<IFilter>({});
  const [sort, setSort] = useState<"age" | "duration" | "frequency" | undefined>(undefined);
  const [selectedProgram, setSelectedProgram] = useState<IProgram | undefined>(undefined);

  const entries = props.programsIndex.filter((entry) => {
    let result = true;
    if (filter.age) {
      result = result && filter.age === entry.age;
    }
    if (filter.duration) {
      result = result && filter.duration === entry.duration;
    }
    if (filter.frequency) {
      result = result && Number(filter.frequency ?? 0) === Number(entry.frequency ?? 0);
    }
    if (filter.goal) {
      result = result && filter.goal === entry.goal;
    }
    return result;
  });
  entries.sort((a, b) => {
    if (sort === "age") {
      const aAgeIndex = builtinProgramAgesKeys.indexOf((a.age ?? "less_than_3_months") as IBuiltinProgramAge);
      const bAgeIndex = builtinProgramAgesKeys.indexOf((b.age ?? "less_than_3_months") as IBuiltinProgramAge);
      return aAgeIndex - bAgeIndex;
    } else if (sort === "duration") {
      const aDurationIndex = builtinProgramDurationsKeys.indexOf((a.duration ?? "30-45") as IBuiltinProgramDuration);
      const bDurationIndex = builtinProgramDurationsKeys.indexOf((b.duration ?? "30-45") as IBuiltinProgramDuration);
      return aDurationIndex - bDurationIndex;
    } else if (sort === "frequency") {
      return (a.frequency ?? 0) - (b.frequency ?? 0);
    }
    return 0;
  });

  return (
    <>
      <div className="px-4">
        <div className="pb-4">
          <span>I've been lifting for </span>
          <SelectLink
            name="builtin-filter-age"
            className="font-semibold"
            values={builtinProgramAges}
            onChange={(age) => setFilter({ ...filter, age })}
            emptyLabel="any time"
            value={filter.age}
          />
          <span>. I can work out </span>
          <SelectLink
            name="builtin-filter-frequency"
            className="font-semibold"
            values={builtinProgramFrequencies}
            onChange={(frequency) => setFilter({ ...filter, frequency })}
            emptyLabel="any number days a week"
            value={filter.frequency}
          />
          <span> for </span>
          <SelectLink
            name="builtin-filter-duration"
            className="font-semibold"
            values={builtinProgramDurations}
            onChange={(duration) => setFilter({ ...filter, duration })}
            emptyLabel="any time"
            value={filter.duration}
          />
          <span>. My goal is </span>
          <SelectLink
            name="builtin-filter-goal"
            className="font-semibold"
            values={builtinProgramGoals}
            onChange={(goal) => setFilter({ ...filter, goal })}
            emptyLabel="strength or hypertrophy"
            value={filter.goal}
          />
          <span>.</span>
        </div>
        <div className="pb-4">
          Sort ascending by:{" "}
          <SelectLink
            name="builtin-sort"
            className="font-semibold"
            values={{ age: "Age", frequency: "Frequency", duration: "Duration" }}
            onChange={(v) => setSort(v)}
            emptyLabel="None"
            value={sort}
          />
        </div>
        {entries.length > 0 ? (
          entries.map((entry) => {
            return (
              <BuiltInProgram
                settings={props.settings}
                entry={entry}
                onClick={() => {
                  const program = props.programs.find((p) => p.id === entry.id);
                  if (program) {
                    setSelectedProgram(program);
                  }
                }}
              />
            );
          })
        ) : (
          <div className="px-6 py-8 text-lg text-center text-text-secondarysubtle">
            No programs found with selected filters
          </div>
        )}
      </div>
      {selectedProgram != null && (
        <ModalProgramInfo
          settings={props.settings}
          program={selectedProgram}
          hasCustomPrograms={props.hasCustomPrograms}
          onClose={() => setSelectedProgram(undefined)}
          onPreview={() => Program.previewProgram(props.dispatch, selectedProgram.id, false)}
          onSelect={() => {
            Program.cloneProgram(props.dispatch, selectedProgram, props.settings);
            if (Settings.doesProgramHaveUnset1RMs(selectedProgram, props.settings)) {
              props.dispatch(Thunk.pushScreen("onerms", undefined, true));
            } else {
              props.dispatch(Thunk.pushScreen("main", undefined, true));
            }
          }}
        />
      )}
    </>
  );
}

interface IBuiltInProgramProps {
  entry: IProgramIndexEntry;
  settings: ISettings;
  onClick: () => void;
}

function BuiltInProgram(props: IBuiltInProgramProps): JSX.Element {
  const { entry } = props;
  const exercises = entry.exercises ?? [];
  const allEquipment = Equipment.currentEquipment(props.settings);
  const equipment = (entry.equipment ?? []).map((e) => equipmentName(e, allEquipment));
  const exercisesRange = entry.exercisesRange;
  const numberOfWeeks = entry.weeksCount ?? 0;

  return (
    <button
      className="relative flex items-center w-full p-3 mb-4 text-left border rounded-lg bg-background-cardpurple border-border-cardpurple nm-program-list-choose-program"
      onClick={props.onClick}
    >
      <div className="flex-1">
        <div className="flex items-center">
          <h3 className="flex-1 mr-2 text-base font-bold">{entry.name}</h3>
          {entry.duration && (
            <div className="text-sm">
              <IconWatch className="mb-1 align-middle" />
              <span className="pl-1 align-middle">{entry.duration} mins</span>
            </div>
          )}
        </div>
        {entry.shortDescription && <Markdown value={entry.shortDescription} className="text-sm text-text-secondary" />}
        <div className="py-3">
          {exercises
            .filter((e) => ExerciseImageUtils.exists(e, "small"))
            .map((e) => (
              <ExerciseImage settings={props.settings} exerciseType={e} size="small" className="w-6 mr-1" />
            ))}
        </div>
        <div className="flex mb-1 text-text-secondary">
          <IconCalendarSmall color={Tailwind.colors().lightgray[600]} className="block mr-1" />{" "}
          <div className="text-xs">
            {numberOfWeeks > 1 && `${numberOfWeeks} ${StringUtils.pluralize("week", numberOfWeeks)}, `}
            {entry.frequency ? `${entry.frequency}x/week, ` : ""}
            {exercisesRange ? Program.exerciseRangeFormat(exercisesRange[0], exercisesRange[1]) : ""}
          </div>
        </div>
        <div className="flex text-text-secondary">
          <IconKettlebellSmall color={Tailwind.colors().lightgray[600]} className="block mr-1" />{" "}
          <div className="text-xs">{equipment.join(", ")}</div>
        </div>
      </div>
    </button>
  );
}
