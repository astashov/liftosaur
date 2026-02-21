import { h, JSX } from "preact";
import { useState } from "preact/hooks";
import { Settings } from "../../models/settings";
import { ProgramsTabContent } from "./programList/programsTabContent";
import { IProgramIndexEntry } from "../../models/program";
import { IProgramFilter, IProgramSort, ProgramFilter } from "../../utils/programFilter";
import { ProgramsFilterSort } from "./programsFilterSort";

export interface IProgramsPageContentProps {
  programs: IProgramIndexEntry[];
  client: Window["fetch"];
}

export function ProgramsPageContent(props: IProgramsPageContentProps): JSX.Element {
  const [filter, setFilter] = useState<IProgramFilter>({});
  const [sort, setSort] = useState<IProgramSort>(undefined);
  const [search, setSearch] = useState("");
  const settings = Settings.build();

  const filteredPrograms = ProgramFilter.sort(ProgramFilter.filter(props.programs, filter, search), sort);

  return (
    <div className="px-4 pb-8">
      <h1 className="pt-4 pb-6 text-3xl font-bold">Programs</h1>

      <ProgramsFilterSort filter={filter} sort={sort} onFilterChange={setFilter} onSortChange={setSort} />

      <ProgramsTabContent programs={filteredPrograms} search={search} onSearchChange={setSearch} settings={settings} />
    </div>
  );
}
