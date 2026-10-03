import { JSX, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLensReducer } from "../../utils/useLensReducer";
import {
  SafeLocalStorage_getItem,
  SafeLocalStorage_setItem,
  SafeLocalStorage_removeItem,
} from "../../utils/safeLocalStorage";
import { Dialog_alert, Dialog_confirm } from "../../utils/dialog";
import { IPlannerState } from "./models/types";
import { LinkInlineInput } from "../../components/inlineInput";
import { lb, lf } from "lens-shmens";
import { HtmlUtils_escapeHtml } from "../../utils/html";
import { Encoder_encodeIntoUrl } from "../../utils/encoder";
import { ModalPlannerSettings, IPlannerSettingsSaveStatus } from "./components/modalPlannerSettings";
import { Settings_webEditorInitial, Settings_webEditorSettingsRequest } from "../../models/settings";
import { getLatestMigrationVersion } from "../../migrations/migrations";
import { canRedo, canUndo, redo, undo, undoRedoMiddleware, useUndoRedo } from "../builder/utils/undoredo";
import { UndoingFlag_set } from "../../utils/undoingFlag";
import {
  IPartialStorage,
  IPlannerProgram,
  IPlannerProgramDay,
  IPlannerProgramWeek,
  IStats,
  IUnit,
} from "../../types";
import { Service } from "../../api/service";
import {
  PlannerProgram_hasNonSelectedWeightUnit,
  PlannerProgram_switchToUnit,
  PlannerProgram_evaluateText,
  PlannerProgram_evaluate,
  PlannerProgram_evaluateFull,
  PlannerProgram_fullToWeekEvalResult,
} from "./models/plannerProgram";
import { IconCloseCircleOutline } from "../../components/icons/iconCloseCircleOutline";
import { IconHelp } from "../../components/icons/iconHelp";
import { PlannerContentPerDay } from "./plannerContentPerDay";
import { PlannerContentFull } from "./plannerContentFull";
import { Modal } from "../../components/modal";
import { GroupHeader } from "../../components/groupHeader";
import { ProgramPreviewOrPlayground } from "../../components/programPreviewOrPlayground";
import { UidFactory_generateUid } from "../../utils/generator";
import { IAccount } from "../../models/account";
import { PlannerBanner } from "./plannerBanner";
import { UrlUtils_build, UrlUtils_buildSafe } from "../../utils/url";
import {
  IExportedProgram,
  Program_create,
  Program_evaluate,
  Program_exportProgram,
} from "../../models/program";
import { ModalPlannerProgramRevisions } from "./modalPlannerProgramRevisions";
import { Weight_oppositeUnit } from "../../models/weight";
import { ModalPlannerPictureExport } from "./components/modalPlannerPictureExport";
import { track } from "../../utils/posthog";
import { BottomSheetOrModalMuscleGroupsContent } from "../../components/bottomSheetOrModalMuscleGroupsContent";
import { BottomSheetMusclesOverride } from "../../components/bottomSheetMusclesOverride";
import { ClipboardUtils_copy } from "../../utils/clipboard";
import { PlannerToolbar } from "./components/plannerToolbar";
import { PlannerHelp } from "./components/plannerHelp";
import { PlannerSidePanelHost } from "./components/plannerSidePanelHost";
import { ModalPlannerSwapScope } from "./components/modalPlannerSwapScope";
import { ModalPlannerEditDetails } from "./components/modalPlannerEditDetails";
import {
  IPlannerWebMode,
  PlannerMode_current,
  PlannerMode_isValid,
  PlannerMode_fullTextAfter,
  PlannerMode_switch,
} from "./models/plannerMode";
import { PlannerUiClamp_apply } from "./models/plannerUiClamp";
import { IPlannerStructureResult } from "./models/plannerStructure";
import { PlannerGridNavigation_create } from "./models/plannerGridNavigation";
import { PlannerBrowserContext } from "./plannerBrowserContext";
import { GridSelectionProvider } from "../../components/editProgram/editProgramGrid/gridSelectionContext";
import { GridActionDock } from "../../components/editProgram/editProgramGrid/gridActionDock";
import {
  IGridEditDetailsRequest,
  IGridEditDetailsResult,
  IGridHost,
} from "../../components/editProgram/editProgramGrid/gridHost";

declare let __HOST__: string;

const toolbarHeightPx = 48;

export interface IPlannerContentProps {
  client: Window["fetch"];
  source?: string;
  nextDay?: number;
  userAgent?: string;
  initialProgram?: IExportedProgram;
  partialStorage?: IPartialStorage;
  deviceId?: string;
  account?: IAccount;
  shouldSync?: boolean;
  revisions: string[];
}

async function saveProgram(
  client: Window["fetch"],
  exportProgram: IExportedProgram,
  deviceId?: string
): Promise<string | undefined> {
  const service = new Service(client);
  const result = await service.postSaveProgram(exportProgram, deviceId);
  if (result.success) {
    return result.data;
  } else {
    Dialog_alert(result.error || "Failed to save the program");
    return undefined;
  }
}

function isChanged(state: IPlannerState): boolean {
  return (
    state.encodedProgram != null &&
    state.initialEncodedProgram != null &&
    state.encodedProgram !== state.initialEncodedProgram
  );
}

function getCurrentUrl(): string | undefined {
  if (typeof window !== "undefined") {
    const url = UrlUtils_build(window.location.href);
    if (/p\/[a-z0-9]+/.test(url.pathname)) {
      url.search = "";
      url.hash = "";
      return url.toString();
    }
  }
  return undefined;
}

function getCurrentSource(): string | undefined {
  if (typeof window !== "undefined") {
    const urlResult = UrlUtils_buildSafe(window.location.href);
    if (urlResult.success) {
      const url = urlResult.data;
      return url.searchParams.get("s") || undefined;
    }
  }
  return undefined;
}

export function PlannerContent(props: IPlannerContentProps): JSX.Element {
  const service = new Service(props.client);
  const initialDay: IPlannerProgramDay = {
    name: "Day 1",
    exerciseText: "",
  };

  const initialWeek: IPlannerProgramWeek = {
    name: "Week 1",
    days: [initialDay],
  };

  const initialPlanner: IPlannerProgram = props.initialProgram?.program?.planner || {
    vtype: "planner",
    name: "My Program",
    weeks: [initialWeek],
  };

  const initialProgram = props.initialProgram?.program
    ? { ...props.initialProgram.program, planner: props.initialProgram.program.planner || initialPlanner }
    : { ...Program_create("My Program", "newprogram"), planner: initialPlanner };

  const [initialSettings] = useState(() =>
    Settings_webEditorInitial(props.partialStorage?.settings, props.initialProgram?.customExercises)
  );
  const [settings, setSettings] = useState(initialSettings);
  const [isBannerLoading, setIsBannerLoading] = useState(false);

  const initialState: IPlannerState = {
    id: initialProgram.id,
    current: {
      program: initialProgram,
    },
    initialEncodedProgram: undefined,
    encodedProgram: undefined,
    ui: {
      weekIndex: 0,
      exerciseUi: { edit: new Set(), collapsed: new Set() },
      dayUi: { collapsed: new Set() },
    },
    history: {
      past: [],
      future: [],
    },
  };
  const stats: IStats = props.partialStorage?.stats || {
    weight: {},
    length: {},
    percentage: {},
  };

  const [state, dispatch] = useLensReducer(initialState, { client: props.client }, [
    async (action, oldState, newState) => {
      if (oldState.current.program !== newState.current.program) {
        track({ name: "edit_program" });
        const exportProgram = Program_exportProgram(newState.current.program, settings);
        dispatch(
          lb<IPlannerState>().p("encodedProgram").record(JSON.stringify(exportProgram)),
          "Update encoded program"
        );
      }
    },
    async (action, oldState, newState) => {
      if (
        !("type" in action && action.type === "Update" && action.desc === "undo") &&
        oldState.current.program !== newState.current.program
      ) {
        undoRedoMiddleware(dispatch, oldState);
      }
    },
    async (action, oldState, newState) => {
      const oldPlanner = oldState.current.program.planner;
      const newPlanner = newState.current.program.planner;
      if (oldPlanner !== newPlanner) {
        const ui = PlannerUiClamp_apply(newState.ui, oldPlanner, newPlanner);
        if (ui !== newState.ui) {
          dispatch(lb<IPlannerState>().p("ui").record(ui), "Clamp UI after structure change");
        }
      }
    },
    async (action, oldState, newState) => {
      const fulltext = PlannerMode_fullTextAfter(oldState, newState);
      if (fulltext != null) {
        UndoingFlag_set(true);
        dispatch(lb<IPlannerState>().p("fulltext").record(fulltext), "Sync full text with program");
      }
    },
    async (action, oldState, newState) => {
      if ("type" in action && action.type === "Update" && action.desc === "stop-is-undoing") {
        setTimeout(() => {
          window.isUndoing = false;
        }, 200);
      }
    },
    async (action, oldState, newState) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).state = newState;
    },
  ]);
  const planner = state.current.program.planner!;
  const mode = PlannerMode_current(state.ui);
  useUndoRedo(state, dispatch, [mode]);
  useEffect(() => {
    if (state.id === "newprogram") {
      const id = UidFactory_generateUid(8);
      dispatch(
        [lb<IPlannerState>().p("id").record(id), lb<IPlannerState>().p("current").p("program").p("id").record(id)],
        "Generate initial ID"
      );
    }
  }, []);
  useEffect(() => {
    setShowHelp(SafeLocalStorage_getItem("hide-planner-help") !== "true");
    if (props.initialProgram) {
      const exportProgram = Program_exportProgram(state.current.program, settings);
      Encoder_encodeIntoUrl(JSON.stringify(exportProgram), window.location.href).then(() => {
        dispatch(
          lb<IPlannerState>().p("initialEncodedProgram").record(JSON.stringify(exportProgram)),
          "Set initial encoded program"
        );
      });
    }
  }, []);
  const [settingsSaveStatus, setSettingsSaveStatus] = useState<IPlannerSettingsSaveStatus | undefined>(undefined);
  const settingsRequest = useMemo(
    () => Settings_webEditorSettingsRequest(initialSettings, settings),
    [
      settings.units,
      settings.timers.workout,
      settings.planner,
      settings.muscleGroups,
      settings.exerciseData,
      settings.exercises,
      settings.starredExercises,
      settings.workoutSettings,
    ]
  );
  const didSkipInitialSettingsSave = useRef(false);
  // Settings belong to the account, not the program, so this is gated on being logged in - `shouldSync`
  // is false on /planner even for a logged-in user, because that program is not attached to the account yet
  const canSaveSettings = props.account != null;
  useEffect(() => {
    if (!canSaveSettings) {
      return;
    }
    if (!didSkipInitialSettingsSave.current) {
      didSkipInitialSettingsSave.current = true;
      return;
    }
    setSettingsSaveStatus("saving");
    const timeout = setTimeout(async () => {
      const result = await service.postSaveSettings({
        ...settingsRequest,
        version: getLatestMigrationVersion(),
        deviceId: props.deviceId,
      });
      setSettingsSaveStatus(result.success ? "saved" : "error");
    }, 750);
    return () => clearTimeout(timeout);
  }, [settingsRequest, canSaveSettings]);

  // "saving" covers both the debounce window and the request in flight; "error" means the edit never landed
  const hasUnsavedSettings = settingsSaveStatus === "saving" || settingsSaveStatus === "error";
  useEffect(() => {
    function onBeforeUnload(e: Event): void {
      if (isChanged(state) || hasUnsavedSettings) {
        e.preventDefault();
        e.returnValue = true;
      }
    }
    function onPopState(e: Event): void {
      window.location.reload();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
    };
  }, [state, hasUnsavedSettings]);

  // The preview's unit switcher is a display toggle - it starts from the user's units, but must not write them back
  const [previewUnits, setPreviewUnits] = useState<IUnit | undefined>(undefined);
  const previewSettings =
    previewUnits != null && previewUnits !== settings.units ? { ...settings, units: previewUnits } : settings;

  const [showClipboardInfo, setShowClipboardInfo] = useState<string | undefined>(undefined);
  const [showHelp, setShowHelp] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clearHasChanges, setClearHasChanges] = useState<boolean>(false);
  const [editDetails, setEditDetails] = useState<
    { request: IGridEditDetailsRequest; onResult: (details?: IGridEditDetailsResult) => void } | undefined
  >(undefined);
  const browserComponents = useContext(PlannerBrowserContext);
  const Grid = browserComponents?.Grid;
  const ExercisePicker = browserComponents?.ExercisePicker;

  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");
  const lbUi = lb<IPlannerState>().p("ui");
  const program = state.current.program;

  const fullText = state.fulltext?.text;
  const fullResult = useMemo(
    () => (mode === "full" && fullText != null ? PlannerProgram_evaluateFull(fullText, settings) : undefined),
    [mode, fullText, settings]
  );
  const fullEvaluation = fullResult?.evaluatedWeeks;
  const { evaluatedWeeks, exerciseFullNames } = useMemo(
    () =>
      fullResult != null
        ? {
            evaluatedWeeks: PlannerProgram_fullToWeekEvalResult(fullResult.evaluatedWeeks),
            exerciseFullNames: fullResult.exerciseFullNames,
          }
        : PlannerProgram_evaluate(planner, settings),
    [fullResult, planner, settings]
  );
  const evaluatedProgram = useMemo(
    () => (mode === "grid" ? Program_evaluate(program, settings) : undefined),
    [mode, program, settings]
  );
  const gridHost = useMemo<IGridHost>(
    () => ({
      createNavigation: PlannerGridNavigation_create,
      openEditDetails: (request, onResult) => setEditDetails({ request, onResult }),
    }),
    []
  );

  const isInvalid = !PlannerMode_isValid(evaluatedWeeks, fullEvaluation);
  const isPanelOpen = !!state.ui.sidePanelOpen;

  function switchMode(to: IPlannerWebMode): void {
    if (to === "grid" && Grid == null) {
      return;
    }
    const next = PlannerMode_switch(state, to);
    if (!next.success) {
      Dialog_alert(`Can't switch yet. ${next.error.message}`);
      return;
    }
    dispatch(
      [lbUi.record(next.data.ui), lb<IPlannerState>().p("fulltext").record(next.data.fulltext)],
      `Switch to ${to} mode`
    );
  }

  function applyStructure(transform: (p: IPlannerProgram) => IPlannerStructureResult, desc: string): boolean {
    const result = transform(planner);
    if (!result.success) {
      Dialog_alert(result.error);
      return false;
    }
    dispatch(lbProgram.record(result.data), desc);
    return true;
  }

  async function copyLink(): Promise<void> {
    track({ name: "copy_link" });
    const exportProgram = Program_exportProgram(program, settings);
    const baseUrl = UrlUtils_build("/planner", window.location.href);
    const encodedUrl = await Encoder_encodeIntoUrl(JSON.stringify(exportProgram), baseUrl.toString());
    const source = getCurrentSource() ?? (settings.affiliateEnabled ? props.account?.id : undefined);
    const url = await service.postShortUrl(encodedUrl.toString(), "p", source);
    ClipboardUtils_copy(url);
    setShowClipboardInfo(url);
  }

  return (
    <section>
      {!props.shouldSync && isChanged(state) && !clearHasChanges && (
        <div className="fixed top-0 left-0 z-50 w-full text-xs text-center border-b border-border-prominent text-text-error bg-background-lighterror">
          Made changes to the program, but the link still goes to the original version. If you want to share updated
          version, generate a new link.
          <button className="p-2 align-middle nm-clear-has-changes" onClick={() => setClearHasChanges(true)}>
            <IconCloseCircleOutline size={14} />
          </button>
        </div>
      )}
      {showHelp && (
        <div className="px-4 pt-4 md:px-8 lg:px-24">
          <PlannerHelp
            onClose={() => {
              setShowHelp(false);
              SafeLocalStorage_setItem("hide-planner-help", "true");
            }}
          />
        </div>
      )}

      {!props.shouldSync && (
        <div className={`px-4 md:px-8 lg:px-24 ${showHelp ? "" : "pt-4"}`}>
          <PlannerBanner
            userAgent={props.userAgent}
            isBannerLoading={isBannerLoading}
            account={props.account}
            onAddProgram={async () => {
              const exportProgram = Program_exportProgram(
                {
                  ...state.current.program,
                  id: UidFactory_generateUid(8),
                },
                settings
              );
              const pg = exportProgram.program;
              if (pg.planner && PlannerProgram_hasNonSelectedWeightUnit(pg.planner, settings)) {
                const fromUnit = Weight_oppositeUnit(settings.units);
                const toUnit = settings.units;
                if (
                  await Dialog_confirm(
                    `The program has weights in ${fromUnit}, do you want to convert them to ${toUnit}?`
                  )
                ) {
                  pg.planner = PlannerProgram_switchToUnit(pg.planner, settings);
                }
              }
              setIsBannerLoading(true);
              const id = await saveProgram(props.client, exportProgram, props.deviceId);
              if (id != null) {
                window.location.href = `${__HOST__}/user/p/${id}`;
              }
            }}
          />
        </div>
      )}

      <div className="flex items-center gap-4 px-4 pb-4 md:px-8 lg:px-24">
        <div className="flex-1 min-w-0">
          {props.source != null && props.source === props.account?.id && (
            <div className="inline-block px-2 mb-1 text-sm rounded-md border-border-cardpurple bg-background-purpledark text-text-purple">
              It's your affiliate link
            </div>
          )}
          <h1 className="text-2xl font-bold md:text-3xl">
            <LinkInlineInput
              value={state.current.program.name}
              onInputString={(v) => {
                dispatch(
                  [lbProgram.p("name").record(v), lb<IPlannerState>().p("current").p("program").p("name").record(v)],
                  "Update program name"
                );
                document.title = `Liftosaur: Weight Lifting Tracking App | ${HtmlUtils_escapeHtml(v)}`;
              }}
            />
          </h1>
          {!props.shouldSync && (
            <button
              className="text-xs font-normal text-text-secondary nm-program-content-change-id"
              title="Generate a new ID"
              onClick={() => {
                const id = UidFactory_generateUid(8);
                dispatch(
                  [
                    lb<IPlannerState>().p("id").record(id),
                    lb<IPlannerState>().p("current").p("program").p("id").record(id),
                  ],
                  "Generate new ID"
                );
              }}
            >
              id: {state.id}
            </button>
          )}
        </div>
        {!showHelp && (
          <button
            className="flex items-center gap-2 text-base font-semibold text-text-secondary nm-planner-help"
            data-testid="planner-help"
            aria-label="How to use Web Editor"
            onClick={() => {
              setShowHelp(true);
              SafeLocalStorage_removeItem("hide-planner-help");
            }}
          >
            <IconHelp />
            <span className="hidden md:inline">How to use Web Editor</span>
          </button>
        )}
      </div>

      <PlannerToolbar
        mode={mode}
        canReorder={!isInvalid}
        canUndo={!!canUndo(state)}
        canRedo={!!canRedo(state)}
        isPanelOpen={isPanelOpen}
        showSave={!!props.shouldSync}
        isSaveDisabled={isLoading || isInvalid || !isChanged(state)}
        isSaving={isLoading}
        isPreviewDisabled={isInvalid}
        onUndo={() => undo(dispatch, state)}
        onRedo={() => redo(dispatch, state)}
        onMode={switchMode}
        onPreview={() => dispatch(lbUi.p("showPreview").record(true), "Show preview")}
        onSave={async () => {
          setIsLoading(true);
          try {
            const exportProgram = Program_exportProgram(state.current.program, settings);
            exportProgram.settings.exerciseData = settings.exerciseData;
            exportProgram.settings.workoutSettings = settings.workoutSettings;
            const savedId = await saveProgram(props.client, exportProgram, props.deviceId);
            if (savedId != null) {
              dispatch(lb<IPlannerState>().p("initialEncodedProgram").record(state.encodedProgram), "Save program");
            }
          } finally {
            setIsLoading(false);
          }
        }}
        onTogglePanel={() => dispatch(lbUi.p("sidePanelOpen").record(!isPanelOpen), "Toggle side panel")}
      />

      <GridSelectionProvider>
        <div className="flex border-b border-border-prominent bg-background-subtle">
          <div className={`flex-1 min-w-0 px-4 py-6 md:px-8 lg:pl-24 ${isPanelOpen ? "hidden md:block" : ""}`}>
            {mode === "grid" && Grid != null && evaluatedProgram != null ? (
              <Grid
                state={state}
                evaluatedProgram={evaluatedProgram}
                settings={settings}
                host={gridHost}
                stickyHeaderHeight={toolbarHeightPx}
                plannerDispatch={dispatch}
              />
            ) : mode === "full" && state.fulltext != null && fullEvaluation != null ? (
              <PlannerContentFull
                fullText={state.fulltext}
                fullEvaluation={fullEvaluation}
                exerciseFullNames={exerciseFullNames}
                settings={settings}
                dispatch={dispatch}
              />
            ) : (
              <PlannerContentPerDay
                program={planner}
                settings={settings}
                ui={state.ui}
                evaluatedWeeks={evaluatedWeeks}
                exerciseFullNames={exerciseFullNames}
                dispatch={dispatch}
                onStructure={applyStructure}
              />
            )}
          </div>
          <aside
            className={`w-full md:w-72 lg:w-80 shrink-0 border-l border-border-prominent bg-background-default ${
              isPanelOpen ? "block" : "hidden md:block"
            }`}
          >
            <div
              className="md:sticky md:overflow-y-auto md:max-h-[calc(100vh-3rem)]"
              style={{ top: toolbarHeightPx, overscrollBehavior: "contain" }}
            >
              <PlannerSidePanelHost
                state={state}
                settings={settings}
                evaluatedWeeks={evaluatedWeeks}
                fullEvaluation={fullEvaluation}
                evaluatedProgram={evaluatedProgram}
                copiedUrl={showClipboardInfo}
                isAffiliateLink={!!props.account?.affiliateEnabled && !!props.account?.id}
                isExportDisabled={isInvalid}
                dispatch={dispatch}
                onCopyLink={copyLink}
                onExportImage={() => dispatch(lbUi.p("showPictureExport").record(true), "Show picture export")}
                onVersions={props.shouldSync && props.revisions.length > 0 ? () => setShowRevisions(true) : undefined}
                onEditSettings={() => dispatch(lbUi.p("showSettingsModal").record(true), "Show settings")}
              />
            </div>
          </aside>
        </div>
        {mode === "grid" && !isPanelOpen && (
          <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden">
            <GridActionDock />
          </div>
        )}
      </GridSelectionProvider>

      {state.ui.editExerciseModal && (
        <ModalPlannerSwapScope
          plannerExercise={state.ui.editExerciseModal.plannerExercise}
          settings={settings}
          dispatch={dispatch}
        />
      )}
      {editDetails && (
        <ModalPlannerEditDetails
          request={editDetails.request}
          onClose={(result) => {
            setEditDetails(undefined);
            editDetails.onResult(result);
          }}
        />
      )}
      {state.ui.showSettingsModal && (
        <ModalPlannerSettings
          inApp={false}
          saveStatus={canSaveSettings ? settingsSaveStatus : undefined}
          dispatch={(recording, _desc) => {
            const recordings = Array.isArray(recording) ? recording : [recording];
            setSettings((prev) => recordings.reduce((acc, r) => r.fn(acc), prev));
          }}
          settings={settings}
          onShowEditMuscleGroups={() => {
            dispatch(lbUi.p("showEditMuscleGroups").record(true), "Show muscle groups");
          }}
          onClose={() => dispatch(lbUi.p("showSettingsModal").record(false), "Close settings modal")}
        />
      )}
      {state.ui.showMuscleGroupsOverride && (
        <BottomSheetMusclesOverride
          helps={[]}
          isHidden={state.ui.showMuscleGroupsOverride == null}
          exerciseType={state.ui.showMuscleGroupsOverride}
          settings={settings}
          onClose={() => {
            dispatch(lbUi.p("showMuscleGroupsOverride").record(undefined), "Close muscles override modal");
          }}
          onNewExerciseData={(newExerciseData) => {
            setSettings(lf(settings).p("exerciseData").set(newExerciseData));
          }}
        />
      )}
      {state.ui.showPreview && (
        <Modal
          isFullWidth={true}
          name="program-preview"
          shouldShowClose={true}
          onClose={() => {
            setPreviewUnits(undefined);
            dispatch(lb<IPlannerState>().pi("ui").p("showPreview").record(false), "Close preview");
          }}
        >
          <GroupHeader size="large" name="Program Preview" />
          <ProgramPreviewOrPlayground
            key={previewSettings.units}
            program={program}
            isMobile={false}
            hasNavbar={false}
            stats={stats}
            settings={previewSettings}
            onChangeUnit={setPreviewUnits}
          />
        </Modal>
      )}
      {state.ui.showEditMuscleGroups && (
        <BottomSheetOrModalMuscleGroupsContent
          settings={settings}
          onClose={() => dispatch(lbUi.p("showEditMuscleGroups").record(false), "Close muscle groups")}
          onNewSettings={(newSettings) => setSettings(newSettings)}
        />
      )}
      {state.ui.exercisePicker && ExercisePicker != null && (
        <ExercisePicker
          picker={state.ui.exercisePicker}
          state={state}
          settings={settings}
          isLoggedIn={!!props.account}
          dispatch={dispatch}
          onChangeSettings={setSettings}
        />
      )}
      {state.ui.showPictureExport && (
        <ModalPlannerPictureExport
          userId={props.account?.id}
          isChanged={isChanged(state)}
          client={props.client}
          url={showClipboardInfo ?? getCurrentUrl()}
          settings={settings}
          program={program}
          onClose={() => dispatch(lbUi.p("showPictureExport").record(false), "Close picture export")}
        />
      )}
      {showRevisions && props.revisions.length > 0 && (
        <ModalPlannerProgramRevisions
          programId={state.id}
          client={props.client}
          revisions={props.revisions}
          onClose={() => setShowRevisions(false)}
          onRestore={(text) => {
            window.isUndoing = true;
            dispatch([lbProgram.p("weeks").record(PlannerProgram_evaluateText(text))], "Restore program");
            setShowRevisions(false);
            dispatch(
              [lb<IPlannerState>().p("fulltext").record(undefined), lbUi.p("mode").record("perday")],
              "stop-is-undoing"
            );
          }}
        />
      )}
    </section>
  );
}
