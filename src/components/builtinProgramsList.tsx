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
  builtinProgramProperties,
} from "../models/builtinPrograms";
import {
  IBuiltinProgramAge,
  IBuiltinProgramDuration,
  IBuiltinProgramFrequency,
  IBuiltinProgramGoal,
} from "../models/builtinPrograms";
import { SelectLink } from "./selectLink";
import { ExerciseImageUtils } from "../models/exerciseImage";
import { Program } from "../models/program";
import { StringUtils } from "../utils/string";
import { Tailwind } from "../utils/tailwindConfig";
import { ExerciseImage } from "./exerciseImage";
import { IconCalendarSmall } from "./icons/iconCalendarSmall";
import { IconKettlebellSmall } from "./icons/iconKettlebellSmall";
import { IconWatch } from "./icons/iconWatch";
import { ModalProgramInfo } from "./modalProgramInfo";
import { Thunk } from "../ducks/thunks";
import { equipmentName } from "../models/exercise";

interface IProps {
  programs: IProgram[];
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

  const programs = props.programs.filter((program) => {
    const properties = builtinProgramProperties[program.id];
    let result = true;
    if (properties) {
      if (filter.age) {
        result = result && filter.age === properties.age;
      }
      if (filter.duration) {
        result = result && filter.duration === properties.duration;
      }
      if (filter.frequency) {
        result = result && Number(filter.frequency ?? 0) === Number(properties.frequency ?? 0);
      }
      if (filter.goal) {
        result = result && filter.goal === properties.goal;
      }
    }
    return result;
  });
  programs.sort((a, b) => {
    const aProperties = builtinProgramProperties[a.id];
    const bProperties = builtinProgramProperties[b.id];
    if (sort === "age") {
      const aAgeIndex = builtinProgramAgesKeys.indexOf(aProperties?.age ?? "less_than_3_months");
      const bAgeIndex = builtinProgramAgesKeys.indexOf(bProperties?.age ?? "less_than_3_months");
      return aAgeIndex - bAgeIndex;
    } else if (sort === "duration") {
      const aDurationIndex = builtinProgramDurationsKeys.indexOf(aProperties?.duration ?? "30-45");
      const bDurationIndex = builtinProgramDurationsKeys.indexOf(bProperties?.duration ?? "30-45");
      return aDurationIndex - bDurationIndex;
    } else if (sort === "frequency") {
      return (aProperties?.frequency ?? 0) - (bProperties?.frequency ?? 0);
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
        {programs.length > 0 ? (
          programs.map((program) => {
            return (
              <BuiltInProgram
                settings={props.settings}
                program={program}
                onClick={() => {
                  setSelectedProgram(program);
                }}
              />
            );
          })
        ) : (
          <div className="px-6 py-8 text-lg text-center text-grayv2-500">No programs found with selected filters</div>
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
            props.dispatch(Thunk.pushScreen("main"));
          }}
        />
      )}
    </>
  );
}

interface IBuiltInProgramProps {
  program: IProgram;
  settings: ISettings;
  onClick: () => void;
}

function BuiltInProgram(props: IBuiltInProgramProps): JSX.Element {
  const properties = builtinProgramProperties[props.program.id];
  const exercises = properties?.exercises ?? [];
  const equipment = (properties?.equipment ?? []).map((e) => equipmentName(e, props.settings.equipment));
  const exercisesRange = properties?.exercisesRange;
  const numberOfWeeks = props.program.planner?.weeks.length ?? 0;

  return (
    <button
      className="relative flex items-center w-full p-3 mb-4 text-left border rounded-lg bg-purplev3-50 border-purplev3-200 nm-program-list-choose-program"
      onClick={props.onClick}
    >
      <div className="flex-1">
        <div className="flex items-center">
          <h3 className="flex-1 mr-2 text-base font-bold">{props.program.name}</h3>
          {properties?.duration && (
            <div className="text-sm">
              <IconWatch className="mb-1 align-middle" />
              <span className="pl-1 align-middle">{properties.duration} mins</span>
            </div>
          )}
        </div>
        <h4 className="text-sm text-grayv2-main">{props.program.shortDescription}</h4>
        <div className="py-3">
          {exercises
            .filter((e) => ExerciseImageUtils.exists(e, "small"))
            .map((e) => (
              <ExerciseImage settings={props.settings} exerciseType={e} size="small" className="w-6 mr-1" />
            ))}
        </div>
        <div className="flex mb-1 text-grayv2-main">
          <IconCalendarSmall color={Tailwind.colors().grayv3.main} className="block mr-1" />{" "}
          <div className="text-xs">
            {numberOfWeeks > 1 && `${numberOfWeeks} ${StringUtils.pluralize("week", numberOfWeeks)}, `}
            {properties?.frequency ? `${properties.frequency}x/week, ` : ""}
            {exercisesRange ? Program.exerciseRangeFormat(exercisesRange[0], exercisesRange[1]) : ""}
          </div>
        </div>
        <div className="flex text-grayv2-main">
          <IconKettlebellSmall color={Tailwind.colors().grayv3.main} className="block mr-1" />{" "}
          <div className="text-xs">{equipment.join(", ")}</div>
        </div>
      </div>
    </button>
  );
}
