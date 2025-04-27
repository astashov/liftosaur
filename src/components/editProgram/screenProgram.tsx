import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../../ducks/types";
import { INavCommon, IState, updateState } from "../../models/state";
import { useCallback, useRef, useState } from "preact/hooks";
import { IProgram, ISettings } from "../../types";
import { Surface } from "../surface";
import { NavbarView } from "../navbar";
import { Footer2View } from "../footer2";
import { ILensDispatch } from "../../utils/useLensReducer";
import { ILensRecordingPayload, lb } from "lens-shmens";
import { IPlannerState } from "../../pages/planner/models/types";
import { HelpEditProgramV2 } from "../help/helpEditProgramV2";
import { undoRedoMiddleware, useUndoRedo } from "../../pages/builder/utils/undoredo";
import { IEvaluatedProgram, Program } from "../../models/program";
import { StringUtils } from "../../utils/string";
import { Tailwind } from "../../utils/tailwindConfig";
import { IconCalendarSmall } from "../icons/iconCalendarSmall";
import { TimeUtils } from "../../utils/time";
import { IconTimerSmall } from "../icons/iconTimerSmall";
import { IconEdit2 } from "../icons/iconEdit2";
import { Modal } from "../modal";
import { Input } from "../input";
import { Button } from "../button";
import { EditProgram } from "../../models/editProgram";
import { ScrollableTabs } from "../scrollableTabs";
import { EditProgramView } from "./editProgram";
import { ProgramPreviewOrPlayground } from "../programPreviewOrPlayground";

interface IProps {
  originalProgram: IProgram;
  plannerState: IPlannerState;
  helps: string[];
  client: Window["fetch"];
  dispatch: IDispatch;
  adminKey?: string;
  settings: ISettings;
  isLoggedIn: boolean;
  revisions: string[];
  navCommon: INavCommon;
}

export function ScreenProgram(props: IProps): JSX.Element {
  const plannerState = props.plannerState;

  const plannerDispatch: ILensDispatch<IPlannerState> = useCallback(
    (lensRecording: ILensRecordingPayload<IPlannerState> | ILensRecordingPayload<IPlannerState>[], desc?: string) => {
      const lensRecordings = Array.isArray(lensRecording) ? lensRecording : [lensRecording];
      updateState(
        props.dispatch,
        lensRecordings.map((recording) => recording.prepend(lb<IState>().pi("editProgramV2"))),
        desc
      );
      const changesCurrent = lensRecordings.some((recording) => recording.lens.from.some((f) => f === "current"));
      if (!(desc === "undo") && changesCurrent) {
        undoRedoMiddleware(plannerDispatch, plannerState);
      }
    },
    [plannerState]
  );
  useUndoRedo(plannerState, plannerDispatch);

  const [showProgramNameModal, setShowProgramNameModal] = useState(false);

  const program = plannerState.current.program;
  const planner = program.planner!;
  const evaluatedProgram = Program.evaluate(program, props.settings);

  return (
    <Surface
      navbar={
        <NavbarView
          navCommon={props.navCommon}
          dispatch={props.dispatch}
          helpContent={<HelpEditProgramV2 />}
          title="Program"
        />
      }
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
      addons={
        <>
          {showProgramNameModal && (
            <ModalChangeProgramName
              onClose={() => setShowProgramNameModal(false)}
              name={evaluatedProgram.name}
              onSelect={(newValue) => {
                EditProgram.setName(props.dispatch, props.originalProgram, newValue);
                plannerDispatch([
                  lb<IPlannerState>().p("current").p("program").p("name").record(newValue),
                  lb<IPlannerState>().p("current").p("program").pi("planner").p("name").record(newValue),
                ]);
                setShowProgramNameModal(false);
              }}
            />
          )}
        </>
      }
    >
      <div>
        <EditProgramHeader
          evaluatedProgram={evaluatedProgram}
          settings={props.settings}
          onClickChangeName={() => {
            setShowProgramNameModal(true);
          }}
        />
        <ScrollableTabs
          topPadding="1rem"
          nonSticky={true}
          defaultIndex={0}
          color="purple"
          tabs={[
            {
              label: "Edit Program",
              children: <EditProgramView plannerDispatch={plannerDispatch} state={plannerState} />,
            },
            {
              label: "Playground",
              children: (
                <ProgramPreviewOrPlayground
                  program={program}
                  isMobile={true}
                  hasNavbar={false}
                  settings={props.settings}
                />
              ),
            },
          ]}
        />
      </div>
    </Surface>
  );
}

interface IEditProgramHeaderProps {
  evaluatedProgram: IEvaluatedProgram;
  onClickChangeName: () => void;
  settings: ISettings;
}

function EditProgramHeader(props: IEditProgramHeaderProps): JSX.Element {
  const evaluatedProgram = props.evaluatedProgram;
  const time = Program.dayAverageTimeMs(evaluatedProgram, props.settings);
  const duration = TimeUtils.formatHOrMin(time);
  return (
    <div className="px-4">
      <div className="flex items-center text-base font-bold">
        <div>{evaluatedProgram.name}</div>
        <div className="leading-none">
          <button className="px-2 py-1 nm-edit-program-name" onClick={props.onClickChangeName}>
            <IconEdit2 size={18} />
          </button>
        </div>
      </div>
      <div>
        <div className="flex mb-1 text-grayv2-main">
          <IconCalendarSmall color={Tailwind.colors().grayv3.main} className="block mr-1" />{" "}
          <div className="text-xs">
            {evaluatedProgram.weeks.length > 1 &&
              `${evaluatedProgram.weeks.length} ${StringUtils.pluralize("week", evaluatedProgram.weeks.length)}, `}
            {Program.daysRange(evaluatedProgram)}, {Program.exerciseRange(evaluatedProgram)}
          </div>
        </div>
        <div className="flex text-grayv2-main">
          <div>
            <IconTimerSmall color={Tailwind.colors().grayv3.main} />
          </div>
          <div className="pl-1 text-xs align-middle">
            {duration.value} {duration.unit}
          </div>
        </div>
      </div>
    </div>
  );
}

interface IModalChangeProgramNameProps {
  onClose: () => void;
  name: string;
  onSelect: (name: string) => void;
}

function ModalChangeProgramName(props: IModalChangeProgramNameProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  return (
    <Modal onClose={props.onClose} shouldShowClose={true}>
      <h3 className="pb-2 text-xl font-bold text-center">Change Program Name</h3>
      <Input
        label="Program Name"
        data-cy="modal-program-name-input"
        ref={textInput}
        defaultValue={props.name}
        type="text"
        placeholder="My Awesome Routine"
        required={true}
        requiredMessage="Please enter a name for your program"
      />
      <p className="mt-4 text-center">
        <Button
          name="modal-program-name-cancel"
          data-cy="modal-program-name-cancel"
          type="button"
          kind="grayv2"
          className="mr-3"
          onClick={props.onClose}
        >
          Cancel
        </Button>
        <Button
          data-cy="modal-program-name-submit"
          name="modal-program-name-submit"
          type="button"
          kind="orange"
          className="ls-modal-program-name"
          onClick={() => {
            if (textInput.current.value) {
              props.onSelect(textInput.current.value);
            }
          }}
        >
          Change
        </Button>
      </p>
    </Modal>
  );
}
