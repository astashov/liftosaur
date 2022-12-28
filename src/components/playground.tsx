import { h, JSX, Fragment } from "preact";
import { buildCardsReducer, ICardsAction } from "../ducks/reducer";
import { IDispatch } from "../ducks/types";
import { Program } from "../models/program";
import { History } from "../models/history";
import { IHistoryRecord, IProgramDay, IProgramExercise, ISettings } from "../types";
import { ExerciseView } from "./exercise";
import { GroupHeader } from "./groupHeader";
import { MenuItemEditable } from "./menuItemEditable";
import { ModalAmrap } from "./modalAmrap";
import { ModalWeight } from "./modalWeight";
import { useRef } from "preact/hooks";
import { ProgramExercise } from "../models/programExercise";

export interface IPlaygroundProps {
  progress: IHistoryRecord;
  programExercise: IProgramExercise;
  allProgramExercises: IProgramExercise[];
  settings: ISettings;
  day: number;
  days: IProgramDay[];
  onProgressChange: (p: IHistoryRecord) => void;
}

export function Playground(props: IPlaygroundProps): JSX.Element {
  const { programExercise, days, settings, progress, allProgramExercises } = props;
  const entry = progress.entries[0];
  const progressRef = useRef(props.progress);
  progressRef.current = props.progress;

  const dispatch: IDispatch = async (action) => {
    const newProgress = buildCardsReducer(settings)(progressRef.current, action as ICardsAction);
    props.onProgressChange(newProgress);
  };

  return (
    <Fragment>
      <GroupHeader
        topPadding={true}
        name="Playground"
        help={
          <span>
            Allows to try out the logic added to this exercise. Choose a day, simulate workout, and verify that the{" "}
            <strong>State Variables</strong> changes are what you expect.
          </span>
        }
      />
      <MenuItemEditable
        name="Choose Day"
        type="select"
        value={`${props.progress.day}`}
        values={[...days.map<[string, string]>((d, i) => [(i + 1).toString(), `${i + 1} - ${d.name}`])]}
        onChange={(newValue) => {
          const newDay = parseInt(newValue || "1", 10);
          const nextVariationIndex = Program.nextVariationIndex(programExercise, allProgramExercises, newDay, settings);
          const newEntry = Program.nextHistoryEntry(
            programExercise.exerciseType,
            newDay,
            ProgramExercise.getVariations(programExercise, allProgramExercises)[nextVariationIndex].sets,
            ProgramExercise.getState(programExercise, allProgramExercises),
            settings,
            ProgramExercise.getWarmupSets(programExercise, allProgramExercises)
          );
          props.onProgressChange(History.buildFromEntry(newEntry, newDay));
        }}
      />
      <ExerciseView
        showKebab={false}
        history={[]}
        showHelp={false}
        entry={entry}
        day={props.day}
        programExercise={programExercise}
        allProgramExercises={allProgramExercises}
        index={0}
        forceShowStateChanges={true}
        settings={props.settings}
        dispatch={dispatch}
        onChangeReps={() => undefined}
        progress={props.progress}
      />
      <ModalAmrap isHidden={progress.ui?.amrapModal == null} dispatch={dispatch} />
      <ModalWeight
        programExercise={progress.ui?.weightModal?.programExercise}
        isHidden={progress.ui?.weightModal == null}
        units={props.settings.units}
        dispatch={dispatch}
        weight={progress.ui?.weightModal?.weight ?? 0}
      />
    </Fragment>
  );
}
