import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { HeaderView } from "./header";
import { FooterView } from "./footer";
import { Program } from "../models/program";
import { Button } from "./button";
import { HistoryRecordView } from "./historyRecord";
import { StringUtils } from "../utils/string";
import { IconMuscles } from "./iconMuscles";
import { Thunk } from "../ducks/thunks";
import { useState, useEffect, useRef } from "preact/hooks";
import { IProgram, IHistoryRecord, ISettings, IStats } from "../types";
import { Tabs } from "./tabs";
import { StatsList } from "./statsList";

type ITab = "Workouts" | "Stats";

interface IProps {
  program: IProgram;
  progress?: IHistoryRecord;
  history: IHistoryRecord[];
  stats: IStats;
  settings: ISettings;
  dispatch: IDispatch;
}

export function ProgramHistoryView(props: IProps): JSX.Element {
  const dispatch = props.dispatch;
  const sortedHistory = props.history.sort((a, b) => {
    return new Date(Date.parse(b.date)).getTime() - new Date(Date.parse(a.date)).getTime();
  });
  const nextHistoryRecord = props.progress || Program.nextProgramRecord(props.program, props.settings);
  const [visibleRecords, setVisibleRecords] = useState<number>(20);
  const visibleRecordsRef = useRef<number>(visibleRecords);
  const containerRef = useRef<HTMLElement>();

  useEffect(() => {
    function scrollHandler(): void {
      if (window.pageYOffset + window.innerHeight > containerRef.current.clientHeight - 500) {
        const vr = Math.min(visibleRecordsRef.current + 20, history.length);
        setVisibleRecords(vr);
        visibleRecordsRef.current = vr;
      }
    }
    window.addEventListener("scroll", scrollHandler);
    return () => window.removeEventListener("scroll", scrollHandler);
  }, []);

  const [tab, setTab] = useState<ITab>("Workouts");

  const history = [nextHistoryRecord, ...sortedHistory];

  return (
    <section className="h-full">
      <HeaderView
        title={StringUtils.truncate(props.program.name, 25)}
        subtitle="Current program"
        right={
          props.progress == null ? (
            <button
              className="ls-history-edit-program p-3"
              onClick={() => Program.editAction(props.dispatch, props.program.id)}
            >
              Edit Program
            </button>
          ) : undefined
        }
      />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }} ref={containerRef}>
        <div className="flex py-3 mb-3 text-center border-b border-gray-200">
          <div className="text-center" style={{ flex: 5 }}>
            <Button
              data-cy="enter-stats"
              kind="blue"
              className="ls-enter-stats"
              onClick={() => props.dispatch(Thunk.pushScreen("stats"))}
            >
              Enter Stats
            </Button>
          </div>
          <div className="text-center" style={{ flex: 7 }}>
            <Button
              kind="green"
              className="ls-start-workout"
              onClick={() => props.dispatch({ type: "StartProgramDayAction" })}
            >
              {props.progress ? "Continue Workout" : "Start New Workout"}
            </Button>
          </div>
        </div>
        <Tabs left="Workouts" right="Stats" selected={tab} onChange={setTab} />
        {tab === "Workouts" &&
          history
            .slice(0, visibleRecordsRef.current)
            .map((historyRecord) => (
              <HistoryRecordView settings={props.settings} historyRecord={historyRecord} dispatch={dispatch} />
            ))}
        {tab === "Stats" && <StatsList dispatch={props.dispatch} settings={props.settings} stats={props.stats} />}
      </section>
      <FooterView
        buttons={
          <button
            className="ls-footer-muscles p-4"
            aria-label="Muscles"
            onClick={() => dispatch(Thunk.pushScreen("musclesProgram"))}
          >
            <IconMuscles />
          </button>
        }
        dispatch={props.dispatch}
      />
    </section>
  );
}
