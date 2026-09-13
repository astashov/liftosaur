import { JSX } from "react";
import { ILiftoEditorController } from "../../components/liftoEditorController";
import { ILiftoEditorFocusEntry, useLiftoEditorFocusEntry } from "../../components/liftoEditorFocus";
import { LiftoEditorCrumbs, LiftoEditorPillRail } from "../../components/liftoEditorChrome";

function focusedController(
  entry: ILiftoEditorFocusEntry | undefined,
  line: ILiftoEditorController
): ILiftoEditorController {
  return entry?.controller ?? line;
}

export function ExerciseLiftoEditorSheetCrumbs(props: { lineController: ILiftoEditorController }): JSX.Element {
  const entry = useLiftoEditorFocusEntry();
  return <LiftoEditorCrumbs controller={focusedController(entry, props.lineController)} />;
}

export function ExerciseLiftoEditorSheetRail(props: {
  lineController: ILiftoEditorController;
  canRemoveLine: boolean;
  onPreview?: () => void;
  isPreviewing: boolean;
  className?: string;
}): JSX.Element {
  const entry = useLiftoEditorFocusEntry();
  const isLine = entry == null || entry.id === "line";
  return (
    <LiftoEditorPillRail
      controller={focusedController(entry, props.lineController)}
      className={props.className}
      canRemove={isLine ? props.canRemoveLine : undefined}
      onPreview={props.onPreview}
      isPreviewing={props.isPreviewing}
    />
  );
}
