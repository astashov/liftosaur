import deepmerge from "deepmerge";
import { lb } from "lens-shmens";
import { h, JSX } from "preact";
import { useMemo, useState } from "preact/hooks";
import { ProgramPreviewPlaygroundDay } from "../../../components/preview/programPreviewPlaygroundDay";
import {
  Program_create,
  Program_nextHistoryRecord,
  Program_evaluate,
  Program_applyEvaluatedProgram,
  Program_runAllFinishDayScripts,
} from "../../../models/program";
import { Settings_build } from "../../../models/settings";
import { IPlannerProgram, IPlannerProgramDay, IPlannerProgramWeek, IProgram, ISettings, IStats } from "../../../types";
import { useLensReducer } from "../../../utils/useLensReducer";
import { PlannerEditorView } from "../../planner/components/plannerEditorView";
import { PlannerProgram_evaluate } from "../../planner/models/plannerProgram";
import { IPlannerState } from "../../planner/models/types";
import { track } from "../../../utils/posthog";
import { IconEditor } from "../../../components/icons/iconEditor";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";

export function CreateYourOwn(): JSX.Element {
  return (
    <div className="py-8 mx-auto md:py-20" style={{ maxWidth: 1000 }}>
      <div className="flex justify-center w-full px-4 mb-2">
        <div className="flex items-center gap-2 text-icon-purple">
          <div>
            <IconEditor color={Tailwind_semantic().icon.purple} />
          </div>
          <div className="font-semibold">Workout Editor</div>
        </div>
      </div>
      <h2 className="px-4 mb-4 text-3xl font-bold text-center md:text-4xl">Create your own programs</h2>
      <p className="px-4 mx-auto mb-8 text-base leading-relaxed text-left md:text-center" style={{ maxWidth: "40rem" }}>
        Write your weightlifting program in plain text with{" "}
        <a href="/docs" target="_blank" className="font-semibold text-purple-600 underline">
          Liftoscript
        </a>
        ! Specify exercises by week/day, sets, and progressive overload rules — and use optional scripting to build
        advanced progression schemes. .
      </p>
      <div className="mb-6">
        <MainEditorAndPlayground />
      </div>
      <div className="block px-4 md:hidden">
        <EditorInfoText />
      </div>
    </div>
  );
}

function MainEditorAndPlayground(): JSX.Element {
  const initialDay: IPlannerProgramDay = {
    name: "",
    exerciseText: `Squat / 5x5 150lb / progress: lp(5lb)
Bench Press / 3x8 100lb / progress: dp(5lb, 8, 12)
`,
  };

  const initialWeek: IPlannerProgramWeek = {
    name: "Week 1",
    days: [initialDay],
  };

  const initialPlanner: IPlannerProgram = {
    vtype: "planner",
    name: "My Program",
    weeks: [initialWeek],
  };
  const initialProgram = { ...Program_create(initialPlanner.name), planner: initialPlanner };
  const settings = Settings_build();

  const initialState: IPlannerState = {
    id: initialProgram.id,
    current: {
      program: initialProgram,
    },
    ui: {
      weekIndex: 0,
      exerciseUi: { edit: new Set(), collapsed: new Set() },
      dayUi: { collapsed: new Set() },
      weekUi: { collapsed: new Set() },
    },
    history: {
      past: [],
      future: [],
    },
  };
  const [state, dispatch] = useLensReducer(initialState, {});
  const planner = state.current.program.planner!;
  const lbDay = lb<IPlannerState>().p("current").pi("program").pi("planner").p("weeks").i(0).p("days").i(0);
  const { evaluatedWeeks, exerciseFullNames } = useMemo(
    () => PlannerProgram_evaluate(planner, settings),
    [state.current.program]
  );
  const evaluatedDay = evaluatedWeeks[0][0];
  const text = planner.weeks[0].days[0].exerciseText;

  return (
    <div className="relative flex flex-col gap-2 mb-1 md:gap-12 md:flex-row">
      <div className="flex-1 min-w-0 px-4">
        <div className="mt-2 mb-2 text-2xl font-bold md:mt-8">See it in action:</div>
        <div className="mb-4 leading-relaxed">
          Change the sets, reps or weight or add "Bicep Curl /{" "}
          <span style={{ color: Tailwind_semantic().syntax.atom }}>3x10</span> /{" "}
          <span style={{ color: Tailwind_semantic().syntax.atom }}>12</span>" on a new line.
        </div>
        <PlannerEditorView
          name="Exercises"
          exerciseFullNames={exerciseFullNames}
          customExercises={{}}
          lineNumbers={true}
          error={evaluatedDay.success ? undefined : evaluatedDay.error}
          value={text}
          onChange={(e) => {
            track({ name: "main_editor" });
            dispatch(lbDay.p("exerciseText").record(e), "Update exercise text");
          }}
          onBlur={() => {}}
          onLineChange={() => {}}
        />
        <div className="hidden md:block">
          <EditorInfoText />
        </div>
      </div>
      <div
        className="absolute hidden md:block"
        style={{
          background: "url(/images/maincontenteditorarrow.svg) 100% 100% no-repeat",
          width: "73px",
          height: "37px",
          top: "170px",
          right: "443px",
        }}
      />
      <div
        className="block mx-auto md:hidden"
        style={{
          background: "url(/images/maincontenteditordownarrow.svg) 100% 100% no-repeat",
          width: "17px",
          height: "35px",
        }}
      />
      <div className="flex-1">
        {evaluatedDay.success && (
          <div className="px-0 pt-0 overflow-auto bg-transparent md:pt-10 md:px-12 md:bg-purple-75 h-96 md:rounded-3xl rounded-t-3xl rounded-w-3xl ">
            <div
              className="overflow-hidden border-purple-300"
              style={{ borderWidth: "3px 3px 0 3px", borderRadius: "48px 48px 0 0" }}
            >
              <div
                className="flex bg-purple-200 border-purple-200"
                style={{ borderWidth: "10px 10px 0 10px", borderRadius: "42px 42px 0 0" }}
              >
                <div
                  className="flex-1 w-full p-4 overflow-hidden bg-white"
                  style={{ borderRadius: "34px 34px 0 0", width: "360px" }}
                >
                  <MainPlayground key={text} planner={planner} settings={settings} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditorInfoText(): JSX.Element {
  return (
    <div className="mt-4 leading-relaxed">
      Custom progressions, myo-reps, drop sets, manipulating weight, reps, RPE or even rest timer via scripts — anything
      is possible.{" "}
      <a href="/docs" target="_blank" className="font-semibold text-purple-600 underline">
        Check the docs
      </a>{" "}
      to learn more about Liftoscript.
    </div>
  );
}

interface IMainPlaygroundProps {
  planner: IPlannerProgram;
  settings: ISettings;
}

function MainPlayground(props: IMainPlaygroundProps): JSX.Element {
  const { planner } = props;
  const stats: IStats = { weight: {}, length: {}, percentage: {} };
  const [settings, setSettings] = useState(props.settings);
  const [program, setProgram] = useState<IProgram>({ ...Program_create("My Program"), planner });
  const [progress, setProgress] = useState(Program_nextHistoryRecord(program, settings, stats, 1));
  const evaluatedProgram = Program_evaluate(program, settings);

  return (
    <ProgramPreviewPlaygroundDay
      stats={stats}
      program={evaluatedProgram}
      day={1}
      isPlayground={true}
      settings={settings}
      progress={progress}
      onProgressChange={(newProgress) => {
        track({ name: "main_playground" });
        setProgress(newProgress);
      }}
      onProgramChange={(newEvaluatedProgram) => {
        track({ name: "main_playground" });
        const newProgram = Program_applyEvaluatedProgram(program, newEvaluatedProgram, settings);
        setProgram(newProgram);
        setProgress(Program_nextHistoryRecord(newProgram, settings, stats, 1));
      }}
      onSettingsChange={(newSettings) => {
        track({ name: "main_playground" });
        setSettings(newSettings);
        setProgress(Program_nextHistoryRecord(program, newSettings, stats, 1));
      }}
      onFinish={() => {
        const { program: newProgram, exerciseData } = Program_runAllFinishDayScripts(
          program,
          progress,
          stats,
          settings
        );
        const newSettings = {
          ...settings,
          exerciseData: deepmerge(settings.exerciseData, exerciseData),
        };
        const newProgress = Program_nextHistoryRecord(newProgram, newSettings, stats, 1);
        setSettings(newSettings);
        setProgram(newProgram);
        setProgress(newProgress);
      }}
    />
  );
}
