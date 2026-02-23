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
      <nav className="pt-2 pb-2 text-xs text-text-secondary" aria-label="Breadcrumb">
        <a href="/" className="underline hover:text-text-primary">
          Home
        </a>
        <span className="mx-1">/</span>
        <span className="text-text-primary">Programs</span>
      </nav>
      <h1 className="pb-6 text-3xl font-bold">Weightlifting Programs & Workout Routines</h1>

      <ProgramsFilterSort filter={filter} sort={sort} onFilterChange={setFilter} onSortChange={setSort} />

      <ProgramsTabContent programs={filteredPrograms} search={search} onSearchChange={setSearch} settings={settings} />
    </div>
  );
}
