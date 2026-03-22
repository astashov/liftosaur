declare module "@crossplatform/components/ExerciseEntryView" {
  import type { IHistoryEntry, ISettings } from "./types";

  interface IExerciseEntryViewProps {
    entry: IHistoryEntry;
    settings: ISettings;
    isLast: boolean;
  }

  export function ExerciseEntryView(props: IExerciseEntryViewProps): any;
}
