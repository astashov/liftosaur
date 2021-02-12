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
import { IProgram, IHistoryRecord, ISettings } from "../types";

interface IProps {
  program: IProgram;
  progress?: IHistoryRecord;
  history: IHistoryRecord[];
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
        <div className="py-3 text-center border-b border-gray-200">
          <Button
            kind="green"
            className="ls-start-workout"
            onClick={() => props.dispatch({ type: "StartProgramDayAction" })}
          >
            {props.progress ? "Continue Workout" : "Start Next Workout"}
          </Button>
        </div>
        {history.slice(0, visibleRecordsRef.current).map((historyRecord) => (
          <HistoryRecordView settings={props.settings} historyRecord={historyRecord} dispatch={dispatch} />
        ))}
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
