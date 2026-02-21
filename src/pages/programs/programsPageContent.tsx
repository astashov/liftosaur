import { h, JSX } from "preact";
import { useState } from "preact/hooks";
import {
  builtinProgramAges,
  builtinProgramDurations,
  builtinProgramFrequencies,
  builtinProgramGoals,
  builtinProgramProperties,
  IBuiltinProgramAge,
  IBuiltinProgramDuration,
  IBuiltinProgramFrequency,
  IBuiltinProgramGoal,
} from "../../models/builtinPrograms";
import { SelectLink } from "../../components/selectLink";
import { Settings } from "../../models/settings";
import { IconFilter2 } from "../../components/icons/iconFilter2";
import { ProgramsTabContent } from "./programList/programsTabContent";

export interface IProgramListItem {
  id: string;
  name: string;
  shortDescription: string;
  weeksCount: number;
}

export interface IProgramsPageContentProps {
  programs: IProgramListItem[];
  client: Window["fetch"];
}

interface IFilter {
  age?: IBuiltinProgramAge;
  duration?: IBuiltinProgramDuration;
  frequency?: IBuiltinProgramFrequency;
  goal?: IBuiltinProgramGoal;
}

export function ProgramsPageContent(props: IProgramsPageContentProps): JSX.Element {
  const [filter, setFilter] = useState<IFilter>({});
  const [search, setSearch] = useState("");
  const settings = Settings.build();

  const filteredPrograms = props.programs.filter((program) => {
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
        result = result && Number(filter.frequency) === Number(properties.frequency);
      }
      if (filter.goal) {
        result = result && filter.goal === properties.goal;
      }
    }
    if (search) {
      result = result && program.name.toLowerCase().includes(search.toLowerCase());
    }
    return result;
  });

  return (
    <div className="px-4 pb-8">
      <h1 className="pt-4 pb-6 text-3xl font-bold">Programs</h1>

      <div className="p-4 mb-6 text-base rounded-lg bg-background-subtle">
        <span className="inline-block mr-1 align-middle">
          <IconFilter2 size={24} />
        </span>
        <span> I've been lifting for </span>
        <SelectLink
          name="programs-filter-age"
          className="font-semibold"
          values={builtinProgramAges}
          onChange={(age) => setFilter({ ...filter, age })}
          emptyLabel="any time"
          value={filter.age}
        />
        <span>. I work out </span>
        <SelectLink
          name="programs-filter-frequency"
          className="font-semibold"
          values={builtinProgramFrequencies}
          onChange={(frequency) => setFilter({ ...filter, frequency })}
          emptyLabel="any number days a week"
          value={filter.frequency}
        />
        <span> for </span>
        <SelectLink
          name="programs-filter-duration"
          className="font-semibold"
          values={builtinProgramDurations}
          onChange={(duration) => setFilter({ ...filter, duration })}
          emptyLabel="any time"
          value={filter.duration}
        />
        <span>. My goal is </span>
        <SelectLink
          name="programs-filter-goal"
          className="font-semibold"
          values={builtinProgramGoals}
          onChange={(goal) => setFilter({ ...filter, goal })}
          emptyLabel="strength or hypertrophy"
          value={filter.goal}
        />
        <span>.</span>
      </div>

      <ProgramsTabContent programs={filteredPrograms} search={search} onSearchChange={setSearch} settings={settings} />
    </div>
  );
}
