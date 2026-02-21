import { h, JSX } from "preact";
import {
  builtinProgramAges,
  builtinProgramDurations,
  builtinProgramFrequencies,
  builtinProgramGoals,
} from "../../models/builtinPrograms";
import { SelectLink } from "../../components/selectLink";
import { IconFilter2 } from "../../components/icons/iconFilter2";
import { IProgramFilter, IProgramSort } from "../../utils/programFilter";

interface IProps {
  filter: IProgramFilter;
  sort: IProgramSort;
  onFilterChange: (filter: IProgramFilter) => void;
  onSortChange: (sort: IProgramSort) => void;
}

export function ProgramsFilterSort(props: IProps): JSX.Element {
  const { filter } = props;
  return (
    <div className="p-4 mb-6 text-base rounded-lg bg-background-subtle">
      <span className="inline-block mr-1 align-middle">
        <IconFilter2 size={24} />
      </span>
      <span> I've been lifting for </span>
      <SelectLink
        name="programs-filter-age"
        className="font-semibold"
        values={builtinProgramAges}
        onChange={(age) => props.onFilterChange({ ...filter, age })}
        emptyLabel="any time"
        value={filter.age}
      />
      <span>. I work out </span>
      <SelectLink
        name="programs-filter-frequency"
        className="font-semibold"
        values={builtinProgramFrequencies}
        onChange={(frequency) => props.onFilterChange({ ...filter, frequency })}
        emptyLabel="any number days a week"
        value={filter.frequency}
      />
      <span> for </span>
      <SelectLink
        name="programs-filter-duration"
        className="font-semibold"
        values={builtinProgramDurations}
        onChange={(duration) => props.onFilterChange({ ...filter, duration })}
        emptyLabel="any time"
        value={filter.duration}
      />
      <span>. My goal is </span>
      <SelectLink
        name="programs-filter-goal"
        className="font-semibold"
        values={builtinProgramGoals}
        onChange={(goal) => props.onFilterChange({ ...filter, goal })}
        emptyLabel="strength or hypertrophy"
        value={filter.goal}
      />
      <span>.</span>
      <span> Sort by: </span>
      <SelectLink
        name="programs-sort"
        className="font-semibold"
        values={{ age: "Age", frequency: "Frequency", duration: "Duration" }}
        onChange={(v) => props.onSortChange(v)}
        emptyLabel="None"
        value={props.sort}
      />
    </div>
  );
}
