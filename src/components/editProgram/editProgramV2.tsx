import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../../ducks/types";
import { GroupHeader } from "../groupHeader";
import { MenuItem } from "../menuItem";
import { EditProgram } from "../../models/editProgram";
import { MenuItemEditable } from "../menuItemEditable";
import { ILoading, IState, updateState } from "../../models/state";
import { Button } from "../button";
import { useMemo, useState, useCallback } from "preact/hooks";
import { ModalPublishProgram } from "../modalPublishProgram";
import { Thunk } from "../../ducks/thunks";
import { IProgram, ISettings } from "../../types";
import { IScreen, Screen } from "../../models/screen";
import { Surface } from "../surface";
import { NavbarView } from "../navbar";
import { Footer2View } from "../footer2";
import { Program } from "../../models/program";
import { LinkButton } from "../linkButton";
import { IconKebab } from "../icons/iconKebab";
import { BottomSheetEditProgram } from "../bottomSheetEditProgram";
import { HelpEditProgramDaysList } from "../help/helpEditProgramDaysList";
import { PlannerProgram } from "../../pages/planner/models/plannerProgram";
import { ILensDispatch } from "../../utils/useLensReducer";
import { EditProgramV2PerDay } from "./editProgramV2PerDay";
import { ILensRecordingPayload, lb } from "lens-shmens";
import { IPlannerState } from "../../pages/planner/models/types";
import { EditProgramV2Full } from "./editProgramV2Full";
import { PlannerToProgram2 } from "../../models/plannerToProgram2";
import { CollectionUtils } from "../../utils/collection";

interface IProps {
  editProgram: IProgram;
  plannerState: IPlannerState;
  programIndex: number;
  screenStack: IScreen[];
  dispatch: IDispatch;
  adminKey?: string;
  settings: ISettings;
  loading: ILoading;
}

export function EditProgramV2(props: IProps): JSX.Element {
  const [shouldShowPublishModal, setShouldShowPublishModal] = useState<boolean>(false);
  const [shouldShowBottomSheet, setShouldShowBottomSheet] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const plannerState = props.plannerState;
  console.log(
    "New planner state",
    plannerState.current.program.weeks.map((w) => w.days.map((d) => d.exerciseText)).flat(2)
  );
  const plannerDispatch: ILensDispatch<IPlannerState> = useCallback(
    (lensRecording: ILensRecordingPayload<IPlannerState> | ILensRecordingPayload<IPlannerState>[], desc?: string) => {
      const lensRecordings = Array.isArray(lensRecording) ? lensRecording : [lensRecording];
      updateState(
        props.dispatch,
        lensRecordings.map((recording) => recording.prepend(lb<IState>().pi("editProgramV2"))),
        desc
      );
    },
    [plannerState]
  );

  const evaluatedWeeks = useMemo(() => {
    return PlannerProgram.evaluate(plannerState.current.program, props.settings.exercises, props.settings.equipment);
  }, [plannerState.current.program, props.settings]);

  console.log(evaluatedWeeks);

  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          helpContent={<HelpEditProgramDaysList />}
          screenStack={props.screenStack}
          rightButtons={[
            <button
              data-cy="navbar-3-dot"
              className="p-2 nm-edit-program-navbar-kebab"
              onClick={() => setShouldShowBottomSheet(true)}
            >
              <IconKebab />
            </button>,
          ]}
          title="Edit Program"
        />
      }
      footer={<Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />}
      addons={
        <>
          <BottomSheetEditProgram
            onExportProgramToFile={() => {
              setShouldShowBottomSheet(false);
              props.dispatch(Thunk.exportProgramToFile(props.editProgram));
            }}
            onExportProgramToLink={() => {
              setShouldShowBottomSheet(false);
              props.dispatch(Thunk.exportProgramToLink(props.editProgram));
            }}
            editProgramId={props.editProgram.id}
            dispatch={props.dispatch}
            isHidden={!shouldShowBottomSheet}
            onClose={() => setShouldShowBottomSheet(false)}
          />
          <ModalPublishProgram
            isHidden={!shouldShowPublishModal}
            program={props.editProgram}
            dispatch={props.dispatch}
            onClose={() => {
              setShouldShowPublishModal(false);
            }}
          />
        </>
      }
    >
      <section>
        <div className="px-4">
          <div className="mb-2 text-sm text-grayv2-main">
            <div>
              You can use{" "}
              <LinkButton
                name="edit-program-copy-program-link"
                onClick={async () => {
                  props.dispatch(
                    Thunk.generateAndCopyLink(props.editProgram, props.settings, () => {
                      setIsCopied(true);
                      setTimeout(() => {
                        setIsCopied(false);
                      }, 3000);
                    })
                  );
                }}
              >
                this link
              </LinkButton>{" "}
              to edit this program on your laptop
            </div>
            {isCopied && <div className="font-bold">Copied to clipboard!</div>}
          </div>
          <GroupHeader name="Current Program" />
          <MenuItem
            name="Program"
            value={props.editProgram.name}
            expandValue={true}
            shouldShowRightArrow={true}
            onClick={() => props.dispatch(Thunk.pushScreen("programs"))}
          />
          <div className="px-2 mb-2 text-xs text-right">
            <LinkButton onClick={() => props.dispatch(Thunk.pushScreen("programs"))} name="history-change-program">
              Change Program
            </LinkButton>
          </div>
          <GroupHeader name="Program Details" topPadding={true} />
          <MenuItemEditable
            type="text"
            name="Name:"
            value={props.editProgram.name}
            onChange={(newValue) => {
              if (newValue) {
                EditProgram.setName(props.dispatch, props.editProgram, newValue);
              }
            }}
          />
          <MenuItemEditable
            type="select"
            name="Next Day:"
            values={Program.getListOfDays(props.editProgram)}
            value={props.editProgram.nextDay.toString()}
            onChange={(newValueStr) => {
              const newValue = newValueStr != null ? parseInt(newValueStr, 10) : undefined;
              if (newValue != null && !isNaN(newValue)) {
                const newDay = Math.max(1, Math.min(newValue, Program.numberOfDays(props.editProgram)));
                EditProgram.setNextDay(props.dispatch, props.editProgram, newDay);
              }
            }}
          />
        </div>
        {props.plannerState.fulltext != null ? (
          <EditProgramV2Full
            plannerProgram={plannerState.current.program}
            ui={plannerState.ui}
            lbUi={lb<IPlannerState>().pi("ui")}
            fulltext={props.plannerState.fulltext}
            settings={plannerState.settings}
            plannerDispatch={plannerDispatch}
          />
        ) : (
          <EditProgramV2PerDay
            plannerProgram={plannerState.current.program}
            plannerSettings={plannerState.settings}
            ui={plannerState.ui}
            settings={props.settings}
            plannerDispatch={plannerDispatch}
            onSave={() => {
              const newProgram = new PlannerToProgram2(
                props.editProgram.id,
                props.plannerState.current.program,
                props.settings
              ).convertToProgram();
              newProgram.planner = props.plannerState.current.program;
              updateState(props.dispatch, [
                lb<IState>()
                  .p("storage")
                  .p("programs")
                  .recordModify((programs) => {
                    return CollectionUtils.setBy(programs, "id", props.editProgram.id, newProgram);
                  }),
                lb<IState>().p("editProgramV2").record(undefined),
              ]);
              props.dispatch(Thunk.pullScreen());
            }}
          />
        )}
        {props.adminKey && (
          <div className="py-3 text-center">
            <Button
              name="publish-program"
              kind="orange"
              onClick={() => {
                setShouldShowPublishModal(true);
              }}
            >
              Publish
            </Button>
          </div>
        )}
      </section>
    </Surface>
  );
}
