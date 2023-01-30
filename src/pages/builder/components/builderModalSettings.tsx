import { lb } from "lens-shmens";
import { h, JSX } from "preact";
import { Modal } from "../../../components/modal";
import { IBuilderDispatch, IBuilderState } from "../models/builderReducer";

interface IBuilderModalSettingsProps {
  unit: "kg" | "lb";
  dispatch: IBuilderDispatch;
}

export function BuilderModalSettings(props: IBuilderModalSettingsProps): JSX.Element {
  function close(): void {
    props.dispatch(lb<IBuilderState>().p("ui").p("modalSettings").record(false));
  }

  return (
    <Modal shouldShowClose={true} onClose={() => close()}>
      <label className="block my-2 text-sm font-bold text-gray-700">
        Weight Units:
        <select
          className="ml-2 border rounded border-grayv2-main"
          value={props.unit}
          onChange={(e) => {
            if (e.target instanceof HTMLSelectElement) {
              props.dispatch([
                lb<IBuilderState>()
                  .p("settings")
                  .p("unit")
                  .record(e.target.value as "kg" | "lb"),
              ]);
            }
          }}
        >
          {["lb", "kg"].map((value) => {
            return (
              <option value={value} selected={value === props.unit}>
                {value}
              </option>
            );
          })}
        </select>
      </label>
    </Modal>
  );
}
