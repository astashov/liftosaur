import { h, JSX } from "preact";
import { GroupHeader } from "../../../components/groupHeader";
import { Modal } from "../../../components/modal";
import { IPlannerProgram, ISettings } from "../../../types";
import { IProgramShareOutputOptions, ProgramShareOutput } from "../../../components/programShareOutput";
import { Button } from "../../../components/button";
import * as htmlToImage from "html-to-image";
import { useRef, useState } from "preact/hooks";
import { IconSpinner } from "../../../components/icons/iconSpinner";
import { MenuItemEditable } from "../../../components/menuItemEditable";

interface IModalPlannerPictureExportProps {
  settings: ISettings;
  program: IPlannerProgram;
  onClose: () => void;
}

export function ModalPlannerPictureExport(props: IModalPlannerPictureExportProps): JSX.Element {
  const sourceRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [url, setUrl] = useState<string | undefined>(undefined);

  let dayIndex = 0;
  const initialDaysToShow: number[] = [];
  props.program.weeks.forEach((w) =>
    w.days.forEach(() => {
      initialDaysToShow.push(dayIndex);
      dayIndex += 1;
    })
  );

  const [config, setConfig] = useState<IProgramShareOutputOptions>({
    showInfo: true,
    columns: 1,
    daysToShow: initialDaysToShow,
  });

  function save(): void {
    setIsLoading(true);
    htmlToImage.toPng(sourceRef.current).then((dataUrl) => {
      setIsLoading(false);
      setUrl(dataUrl);
    });
  }

  return (
    <Modal shouldShowClose={true} onClose={props.onClose} noPaddings={true}>
      <div className="flex flex-1 min-h-0">
        <div
          className="p-4 border-r bg-grayv2-50 border-grayv2-200"
          style={{ borderRadius: "0.5rem 0 0 0.5rem", minWidth: "16rem" }}
        >
          <GroupHeader size="large" name="Export program to pictures" />
          <MenuItemEditable
            name="Include program details"
            type="boolean"
            value={config.showInfo ? "true" : "false"}
            onChange={(v) => setConfig({ ...config, showInfo: v === "true" })}
          />
          <MenuItemEditable
            name="Columns"
            type="number"
            value={config.columns.toString()}
            onChange={(v) => {
              if (v != null && !isNaN(Number(v)) && Number(v) > 0) {
                setConfig({ ...config, columns: Number(v) });
              }
            }}
          />
          <div className="mt-2 text-center">
            <Button name="export-program-picture" kind="orange" onClick={() => save()}>
              Generate
            </Button>
          </div>
          <div>
            {isLoading ? (
              <IconSpinner width={40} height={40} />
            ) : url ? (
              <img src={url} className="w-full" />
            ) : undefined}
          </div>
        </div>
        <div className="flex flex-col flex-1 overflow-auto" style={{ minWidth: "24rem" }}>
          <div ref={sourceRef}>
            <ProgramShareOutput settings={props.settings} program={props.program} options={config} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
