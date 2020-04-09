import { h, JSX } from "preact";
import { CardsView } from "./cards";
import { HeaderView } from "./header";
import { FooterView } from "./footer";
import { ICurrent, IWebpushr, ISettings } from "../ducks/reducer";
import { Program } from "../models/program";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord } from "../models/history";
import { IStats } from "../models/stats";
import { ModalAmrap } from "./modalAmrap";
import { DateUtils } from "../utils/date";
import { ModalWeight } from "./modalWeight";
import { useState } from "preact/hooks";
import { Timer } from "./timer";
import { IProgressMode } from "../models/progress";

interface IProps {
  current: ICurrent;
  history: IHistoryRecord[];
  stats: IStats;
  settings: ISettings;
  dispatch: IDispatch;
  webpushr?: IWebpushr;
}

export function ProgramDayView(props: IProps): JSX.Element | null {
  const progress = props.current.progress;
  const [timerStart, setTimerStart] = useState<number | undefined>(undefined);
  const [timerMode, setTimerMode] = useState<IProgressMode | undefined>(undefined);

  if (progress != null) {
    const currentProgram = Program.get(props.current.programId);
    const programDay = currentProgram.days[progress.day];
    const lastHistoryRecord = props.history.find(i => i.programId === currentProgram.id);
    const nextHistoryRecord = Program.nextProgramRecord(currentProgram, props.stats, lastHistoryRecord?.day);
    return (
      <section className="flex flex-col h-full relative">
        <HeaderView title={DateUtils.format(new Date())} subtitle={currentProgram.name} />
        <CardsView
          progress={progress}
          programDay={programDay}
          nextHistoryRecord={nextHistoryRecord}
          availablePlates={props.settings.plates}
          dispatch={props.dispatch}
          onChangeReps={mode => {
            setTimerMode(mode);
            setTimerStart(new Date().getTime());
          }}
        />
        <section className="relative">
          <Timer
            mode={timerMode ?? "workout"}
            timerStart={timerStart}
            webpushr={props.webpushr}
            timers={props.settings.timers}
          />
          <FooterView />
        </section>
        {progress.ui.amrapModal != null ? <ModalAmrap dispatch={props.dispatch} /> : undefined}
        {progress.ui.weightModal != null ? (
          <ModalWeight dispatch={props.dispatch} weight={progress.ui.weightModal.weight} />
        ) : (
          undefined
        )}
      </section>
    );
  } else {
    return null;
  }
}
