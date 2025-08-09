import { h, JSX } from "preact";
import { useState } from "preact/hooks";
import { LabelAndInput } from "../labelAndInput";
import { IExercisePickerState } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";

interface IProps {
  templateName?: string;
  dispatch: ILensDispatch<IExercisePickerState>;
}

export function ExercisePickerTemplate(props: IProps): JSX.Element {
  const [name, setName] = useState<string>(props.templateName ?? "");
  const [nameError, setNameError] = useState<string | undefined>(undefined);

  return (
    <form onSubmit={(e) => e.preventDefault()} className="mx-4 mt-4 mb-4">
      <LabelAndInput
        star={true}
        identifier="exercise-template-name"
        label="Template Name"
        errorMessage={nameError}
        value={name}
        placeholder="My Awesome Template"
        onInput={(e) => {
          const value = e.currentTarget.value?.trim() || "";
          setName(value);
          if (!value) {
            setNameError("Name cannot be empty");
          } else if (/[/{}()\t\n\r#\[\]]+/.test(value)) {
            setNameError("Name cannot contain special characters: '/{}()#[]'");
          } else {
            setNameError(undefined);
            props.dispatch(lb<IExercisePickerState>().p("templateName").record(value), `Set template name to ${value}`);
          }
        }}
      />
      <div className="my-2 text-sm">
        You can choose any name for the template, and it will be saved as <strong>"non-used"</strong> (i.e. as a
        template). You can reuse <strong>sets</strong>, <strong>warmup</strong>, <strong>update</strong> or{" "}
        <strong>progress</strong> from this template in your real exercises.
      </div>
    </form>
  );
}
