import { h, JSX } from "preact";
import { IExportedProgram } from "../../models/program";
import { Settings } from "../../models/settings";
import { UidFactory } from "../../utils/generator";
import { IAccount } from "../../models/account";
import { MigrationBanner } from "../../components/migrationBanner";

export interface IProgramContentProps {
  client: Window["fetch"];
  isMobile: boolean;
  account?: IAccount;
  exportedProgram?: IExportedProgram;
  shouldSync: boolean;
}

export function ProgramContent(props: IProgramContentProps): JSX.Element {
  const defaultSettings = Settings.build();
  const programContentSettings = props.exportedProgram?.settings || Settings.programContentBuild();
  const settings = {
    ...defaultSettings,
    ...programContentSettings,
    timers: { ...defaultSettings.timers, ...programContentSettings.timers },
    exercises: { ...defaultSettings.exercises, ...(props.exportedProgram?.customExercises || {}) },
  };
  const program = props.exportedProgram?.program || {
    id: UidFactory.generateUid(8),
    name: "My Program",
    url: "",
    author: "",
    shortDescription: "",
    description: "",
    nextDay: 1,
    isMultiweek: false,
    weeks: [],
    days: [{ id: UidFactory.generateUid(8), name: "Day 1", exercises: [] }],
    exercises: [],
    tags: [],
  };

  return (
    <div>
      <MigrationBanner program={program} settings={settings} client={props.client} />
    </div>
  );
}
