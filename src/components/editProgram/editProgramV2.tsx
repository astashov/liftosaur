import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../../ducks/types";
import { GroupHeader } from "../groupHeader";
import { MenuItem } from "../menuItem";
import { EditProgram } from "../../models/editProgram";
import { MenuItemEditable } from "../menuItemEditable";
import { ILoading, IState, updateState } from "../../models/state";
import { Button } from "../button";
import { useState, useCallback } from "preact/hooks";
import { ModalPublishProgram } from "../modalPublishProgram";
import { Thunk } from "../../ducks/thunks";
import { IProgram, ISettings } from "../../types";
import { IScreen, Screen } from "../../models/screen";
import { Surface } from "../surface";
import { NavbarView } from "../navbar";
import { Footer2View } from "../footer2";
import { Program } from "../../models/program";
import { LinkButton } from "../linkButton";
import { HelpEditProgramDaysList } from "../help/helpEditProgramDaysList";
import { ILensDispatch } from "../../utils/useLensReducer";
import { EditProgramV2PerDay } from "./editProgramV2PerDay";
import { ILensRecordingPayload, lb } from "lens-shmens";
import { IPlannerState } from "../../pages/planner/models/types";
import { EditProgramV2Full } from "./editProgramV2Full";
import { PlannerToProgram2 } from "../../models/plannerToProgram2";
import { CollectionUtils } from "../../utils/collection";
import { ProgramPreviewOrPlayground } from "../programPreviewOrPlayground";
import { Modal } from "../modal";
import { ModalPlannerSettings } from "../../pages/planner/components/modalPlannerSettings";

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

  const plannerState = props.plannerState;
  const plannerDispatch: ILensDispatch<IPlannerState> = useCallback(
    (lensRecording: ILensRecordingPayload<IPlannerState> | ILensRecordingPayload<IPlannerState>[], desc?: string) => {
      const lensRecordings = Array.isArray(lensRecording) ? lensRecording : [lensRecording];
      console.log("lr", lensRecordings);
      updateState(
        props.dispatch,
        lensRecordings.map((recording) => recording.prepend(lb<IState>().pi("editProgramV2"))),
        desc
      );
    },
    [plannerState]
  );

  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          helpContent={<HelpEditProgramDaysList />}
          screenStack={props.screenStack}
          title="Edit Program"
        />
      }
      footer={<Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />}
      addons={
        <>
          <ModalPublishProgram
            isHidden={!shouldShowPublishModal}
            program={props.editProgram}
            dispatch={props.dispatch}
            onClose={() => {
              setShouldShowPublishModal(false);
            }}
          />
          {plannerState.ui.showPreview && (
            <Modal
              isFullWidth={true}
              shouldShowClose={true}
              onClose={() => plannerDispatch(lb<IPlannerState>().pi("ui").p("showPreview").record(false))}
            >
              <GroupHeader size="large" name="Program Preview" />
              <ProgramPreviewOrPlayground
                program={new PlannerToProgram2(
                  props.editProgram.id,
                  plannerState.current.program,
                  props.settings
                ).convertToProgram()}
                isMobile={true}
                hasNavbar={false}
                settings={props.settings}
              />
            </Modal>
          )}
          {plannerState.ui.showSettingsModal && (
            <ModalPlannerSettings
              inApp={true}
              onNewSettings={(newSettings) =>
                updateState(props.dispatch, [lb<IState>().p("storage").p("settings").record(newSettings)])
              }
              settings={props.settings}
              onClose={() => plannerDispatch(lb<IPlannerState>().p("ui").p("showSettingsModal").record(false))}
            />
          )}
        </>
      }
    >
      <section>
        <div className="px-4">
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
            settings={props.settings}
            plannerDispatch={plannerDispatch}
          />
        ) : (
          <EditProgramV2PerDay
            plannerProgram={plannerState.current.program}
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
