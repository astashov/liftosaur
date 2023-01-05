import { Program } from "../../models/program";
import { IDispatch } from "../../ducks/types";
import { h, JSX } from "preact";
import { EditProgramExerciseAdvanced } from "./editProgramExerciseAdvanced";
import { EditProgramExerciseSimple } from "./editProgramExerciseSimple";
import { ISettings, IProgramDay, IProgramExercise, ISubscription } from "../../types";
import { ILoading } from "../../models/state";
import { IScreen } from "../../models/screen";
import { NavbarView } from "../navbar";
import { rightFooterButtons } from "../rightFooterButtons";
import { Surface } from "../surface";
import { Footer2View } from "../footer2";
import { Tabs2 } from "../tabs2";
import { useState } from "preact/hooks";
import { HelpEditProgramExerciseSimple } from "../help/helpEditProgramExerciseSimple";
import { HelpEditProgramExerciseAdvanced } from "../help/helpEditProgramExerciseAdvanced";

interface IProps {
  settings: ISettings;
  days: IProgramDay[];
  programIndex: number;
  screenStack: IScreen[];
  allProgramExercises: IProgramExercise[];
  subscription: ISubscription;
  programExercise: IProgramExercise;
  isChanged: boolean;
  programName: string;
  loading: ILoading;
  dispatch: IDispatch;
}

export function EditProgramExercise(props: IProps): JSX.Element {
  const isEligibleForSimple = Program.isEligibleForSimpleExercise(props.programExercise).success;
  const initialTab = isEligibleForSimple ? 0 : 1;
  const [selectedTab, setSelectedTab] = useState<number>(initialTab);

  return (
    <Surface
      navbar={
        <NavbarView
          onBack={() => !props.isChanged || confirm("Are you sure? Your changes won't be saved")}
          loading={props.loading}
          dispatch={props.dispatch}
          helpContent={selectedTab === 0 ? <HelpEditProgramExerciseSimple /> : <HelpEditProgramExerciseAdvanced />}
          screenStack={props.screenStack}
          title="Edit Program Exercise"
          subtitle={props.programName}
        />
      }
      footer={<Footer2View dispatch={props.dispatch} rightButtons={rightFooterButtons({ dispatch: props.dispatch })} />}
    >
      <Tabs2
        onChange={(index) => setSelectedTab(index)}
        defaultIndex={initialTab}
        tabs={[
          ["Simple", <EditProgramExerciseSimple {...props} />],
          ["Advanced", <EditProgramExerciseAdvanced {...props} />],
        ]}
      />
    </Surface>
  );
}
