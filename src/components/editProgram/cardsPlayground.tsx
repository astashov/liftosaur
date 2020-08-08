import { JSX, h } from "preact";
import { IProgram } from "../../models/program";
import { ISettings } from "../../models/settings";
import { IHistoryRecord } from "../../models/history";
import { IDispatch } from "../../ducks/types";
import { ModalAmrap } from "../modalAmrap";
import { ModalWeight } from "../modalWeight";
import { ExcerciseView } from "../excercise";
import { ICardsAction, buildCardsReducer } from "../../ducks/reducer";

interface IProps {
  program: IProgram;
  settings: ISettings;
  progress: IHistoryRecord;
  setProgress: (progress: IHistoryRecord) => void;
}

export function CardsPlayground(props: IProps): JSX.Element {
  const { progress, settings } = props;

  const dispatch: IDispatch = async (action) => {
    const newProgress = buildCardsReducer(settings)(progress, action as ICardsAction);
    props.setProgress(newProgress);
  };

  return (
    <section>
      {progress.entries.map((entry) => {
        return (
          <ExcerciseView settings={props.settings} entry={entry} dispatch={dispatch} onChangeReps={() => undefined} />
        );
      })}
      <ModalAmrap isHidden={progress.ui?.amrapModal == null} dispatch={dispatch} />
      <ModalWeight
        isHidden={progress.ui?.weightModal == null}
        units={props.settings.units}
        dispatch={dispatch}
        weight={progress.ui?.weightModal?.weight ?? 0}
      />
    </section>
  );
}
