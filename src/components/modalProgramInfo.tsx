import { h, JSX } from "preact";
import { Button } from "./button";
import { Modal } from "./modal";
import { IProgram, ISettings } from "../types";
import { Link } from "./link";
import { IconWatch } from "./icons/iconWatch";
import { TimeUtils } from "../utils/time";
import { Program } from "../models/program";

interface IProps {
  program: IProgram;
  hasCustomPrograms: boolean;
  settings: ISettings;
  onSelect: () => void;
  onPreview: () => void;
  onClose: () => void;
}

export function ModalProgramInfo(props: IProps): JSX.Element {
  const evaluatedProgram = Program.evaluate(props.program, props.settings);
  const time = Program.dayAverageTimeMs(evaluatedProgram, props.settings);
  const formattedTime = time > 0 ? TimeUtils.formatHHMM(time) : undefined;
  return (
    <Modal shouldShowClose={true} onClose={props.onClose}>
      <h2 className="pr-6 text-lg font-bold">
        {props.hasCustomPrograms ? "Clone" : "Start"} <Link href={props.program.url}>{props.program.name}</Link>
      </h2>
      <div className="text-sm text-grayv2-700">by {props.program.author}</div>
      {formattedTime && (
        <div className="flex items-center pb-1 text-sm">
          <div className="pr-1">
            <IconWatch />
          </div>
          <div className="flex-1" style={{ paddingTop: "2px" }}>
            Average time of a workout: <strong>{formattedTime}</strong>
          </div>
        </div>
      )}
      <div
        dangerouslySetInnerHTML={{ __html: props.program.description }}
        className="mt-4 text-sm program-description"
      />
      <p className="mt-6 text-center">
        <Button
          name="preview-program"
          data-cy="preview-program"
          type="button"
          kind="purple"
          className="mr-3"
          onClick={props.onPreview}
        >
          Preview
        </Button>
        <Button
          name="clone-program"
          type="button"
          kind="orange"
          data-cy="clone-program"
          className="mr-3 ls-modal-clone-program"
          onClick={props.onSelect}
        >
          {props.hasCustomPrograms ? "Clone" : "Start"}
        </Button>
      </p>
    </Modal>
  );
}
