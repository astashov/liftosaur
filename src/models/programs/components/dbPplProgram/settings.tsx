import { h, JSX } from "preact";
import { IDispatch } from "../../../../ducks/types";
import { IProgramId, Program } from "../../../program";
import { FooterView } from "../../../../components/footer";
import { HeaderView } from "../../../../components/header";
import { Thunk } from "../../../../ducks/thunks";
import { IDbPplState } from "../../dbPpl";
import { MenuItemEditable } from "../../../../components/menuItemEditable";
import { ObjectUtils } from "../../../../utils/object";
import { Excercise } from "../../../excercise";
import { lb } from "../../../../utils/lens";
import { GroupHeader } from "../../../../components/groupHeader";

interface IProps {
  dispatch: IDispatch;
  state: IDbPplState;
  programId: IProgramId;
}

export function DbPplProgramSettings(props: IProps): JSX.Element {
  const program = Program.get(props.programId);
  return (
    <section className="h-full">
      <HeaderView
        title="Program Settings"
        subtitle={program.name}
        left={<button onClick={() => props.dispatch(Thunk.pullScreen())}>Back</button>}
      />
      <section className="flex flex-col" style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <GroupHeader name="Increments" />
        {ObjectUtils.keys(props.state).map((excercise) => (
          <MenuItemEditable
            name={Excercise.get(excercise).name}
            type="number"
            value={`${props.state[excercise].increment}`}
            valueUnits="lb"
            onChange={(newValue?: string) => {
              const weight = parseInt(newValue!, 10);
              const lensRecording = lb<IDbPplState>().p(excercise).p("increment").record(weight);
              props.dispatch({ type: "UpdateProgramState", name: "dbPpl", lensRecording: lensRecording });
            }}
          />
        ))}
      </section>
      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
