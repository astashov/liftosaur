import { lb } from "lens-shmens";
import { h, JSX } from "preact";
import { useState, useMemo } from "preact/hooks";
import { LinkButton } from "../../components/linkButton";
import { IPlannerProgram, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { EditProgramV2EditDayModal } from "./editProgramV2EditDayModal";
import { EditProgramV2Days } from "./editProgramV2Days";
import { EditProgramV2Weeks } from "./editProgramV2Weeks";
import { PlannerProgram } from "../../pages/planner/models/plannerProgram";

export interface IPlannerContentPerDayProps {
  plannerProgram: IPlannerProgram;
  settings: ISettings;
  ui: IPlannerUi;
  onSave: () => void;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramV2PerDay(props: IPlannerContentPerDayProps): JSX.Element {
  const { plannerProgram, settings, ui, plannerDispatch } = props;
  const lbProgram = lb<IPlannerState>().p("current").pi("program");
  const [editDayModal, setEditDayModal] = useState<{ weekIndex: number; dayIndex: number } | undefined>(undefined);
  const dayNameModal =
    plannerProgram.weeks[editDayModal?.weekIndex || 0]?.days[editDayModal?.dayIndex || 0]?.name ?? "";
  const evaluatedWeeks = useMemo(() => {
    return PlannerProgram.evaluate(plannerProgram, settings);
  }, [plannerProgram, settings]);

  return (
    <div>
      {props.ui.subscreen !== "weeks" && (
        <div className="px-4">
          <LinkButton
            name="planner-edit-weeks"
            onClick={() => props.plannerDispatch(lb<IPlannerState>().pi("ui").p("subscreen").record("weeks"))}
          >
            Edit Weeks
          </LinkButton>
        </div>
      )}
      {props.ui.subscreen === "weeks" ? (
        <EditProgramV2Weeks
          evaluatedWeeks={evaluatedWeeks}
          plannerProgram={plannerProgram}
          settings={settings}
          plannerDispatch={plannerDispatch}
          lbProgram={lbProgram}
          onEditWeekName={() => undefined}
          onEditDayName={() => undefined}
        />
      ) : (
        <EditProgramV2Days
          plannerProgram={plannerProgram}
          evaluatedWeeks={evaluatedWeeks}
          lbUi={lb<IPlannerState>().pi("ui")}
          ui={ui}
          settings={settings}
          lbProgram={lbProgram}
          onSave={props.onSave}
          onEditDayModal={(data) => setEditDayModal(data)}
          plannerDispatch={plannerDispatch}
        />
      )}
      <EditProgramV2EditDayModal
        onSelect={(name: string) => {
          if (name && editDayModal != null) {
            plannerDispatch(
              lbProgram.p("weeks").i(editDayModal.weekIndex).p("days").i(editDayModal.dayIndex).p("name").record(name)
            );
            setEditDayModal(undefined);
          }
        }}
        key={dayNameModal}
        onClose={() => setEditDayModal(undefined)}
        currentValue={dayNameModal}
        isHidden={!editDayModal}
      />
    </div>
  );
}
