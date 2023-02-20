import { h, JSX } from "preact";

interface IEditProgramExerciseSimpleErrorsProps {
  errors: string[];
}

export function EditProgramExerciseSimpleErrors(props: IEditProgramExerciseSimpleErrorsProps): JSX.Element {
  return (
    <section className="p-4 text-sm">
      <p>
        You cannot use <strong>Simple</strong> exercise editing. You can only use <strong>Advanced</strong> mode. To use
        Simple mode, the exercise should have the following:
      </p>
      <ul className="pl-4 mt-2 list-disc" data-cy="simple-errors">
        {props.errors.map((e) => (
          <li dangerouslySetInnerHTML={{ __html: e }} />
        ))}
      </ul>
      <p className="mt-2">
        So, please use <strong>Advanced</strong> editing mode.
      </p>
    </section>
  );
}
