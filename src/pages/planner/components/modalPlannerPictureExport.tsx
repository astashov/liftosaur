import { h, JSX } from "preact";
import { GroupHeader } from "../../../components/groupHeader";
import { Modal } from "../../../components/modal";
import { IPlannerProgram, ISettings } from "../../../types";
import { IProgramShareOutputOptions, ProgramShareOutput } from "../../../components/programShareOutput";
import { Button } from "../../../components/button";
import * as htmlToImage from "html-to-image";
import { Ref, useRef, useState } from "preact/hooks";
import { IconSpinner } from "../../../components/icons/iconSpinner";
import { MenuItemEditable } from "../../../components/menuItemEditable";
import { CollectionUtils } from "../../../utils/collection";
import { LinkButton } from "../../../components/linkButton";
import { StringUtils } from "../../../utils/string";
import { ImageShareUtils } from "../../../utils/imageshare";

interface IModalPlannerPictureExportProps {
  settings: ISettings;
  program: IPlannerProgram;
  onClose: () => void;
}

function getInitialDaysToShow(program: IPlannerProgram): number[] {
  let dayIndex = 0;
  const initialDaysToShow: number[] = [];
  program.weeks.forEach((w) =>
    w.days.forEach(() => {
      initialDaysToShow.push(dayIndex);
      dayIndex += 1;
    })
  );
  return initialDaysToShow;
}

export function ModalPlannerPictureExport(props: IModalPlannerPictureExportProps): JSX.Element {
  const sourceRef = useRef<HTMLDivElement>(null);

  const initialDaysToShow = getInitialDaysToShow(props.program);
  const [config, setConfig] = useState<IProgramShareOutputOptions>({
    showInfo: true,
    showDayDescription: true,
    showWeekDescription: true,
    columns: 1,
    daysToShow: initialDaysToShow,
  });

  return (
    <Modal shouldShowClose={true} onClose={props.onClose} noPaddings={true}>
      <div className="flex flex-col flex-1 min-h-0 sm:flex-row">
        <div
          className="p-4 border-r bg-grayv2-50 border-grayv2-200"
          style={{ borderRadius: "0.5rem 0 0 0.5rem", minWidth: "16rem" }}
        >
          <SettingsTab
            program={props.program}
            initialDaysToShow={initialDaysToShow}
            sourceRef={sourceRef}
            config={config}
            setConfig={setConfig}
          />
        </div>
        <div className="flex flex-col flex-1 overflow-auto" style={{ minWidth: "24rem" }}>
          <div>
            <div className="px-4 py-2">
              <GroupHeader size="large" name="Preview" />
            </div>
            <ProgramShareOutput ref={sourceRef} settings={props.settings} program={props.program} options={config} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

interface ISettingsTabProps {
  program: IPlannerProgram;
  initialDaysToShow: number[];
  sourceRef: Ref<HTMLDivElement>;
  config: IProgramShareOutputOptions;
  setConfig: (config: IProgramShareOutputOptions) => void;
}

function SettingsTab(props: ISettingsTabProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const { config, setConfig, sourceRef } = props;

  function save(): void {
    setIsLoading(true);
    htmlToImage.toPng(sourceRef.current, { pixelRatio: 2 }).then((dataUrl) => {
      setIsLoading(false);
      const filename = StringUtils.dashcase(props.program.name) + ".png";
      const imageShareUtils = new ImageShareUtils(dataUrl, filename);
      imageShareUtils.shareOrDownload();
    });
  }

  let dayIndex = 0;

  return (
    <div>
      <div className="my-2 text-center">
        <Button name="export-program-picture" kind="orange" className="w-48" onClick={() => save()}>
          {isLoading ? <IconSpinner width={12} height={12} color="white" /> : "Generate image"}
        </Button>
      </div>
      <GroupHeader size="large" name="Export program to image" />
      <MenuItemEditable
        name="Include program details"
        type="boolean"
        value={config.showInfo ? "true" : "false"}
        onChange={(v) => setConfig({ ...config, showInfo: v === "true" })}
      />
      <MenuItemEditable
        name="Include week descriptions"
        type="boolean"
        value={config.showWeekDescription ? "true" : "false"}
        onChange={(v) => setConfig({ ...config, showWeekDescription: v === "true" })}
      />
      <MenuItemEditable
        name="Include day descriptions"
        type="boolean"
        value={config.showDayDescription ? "true" : "false"}
        onChange={(v) => setConfig({ ...config, showDayDescription: v === "true" })}
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
      <GroupHeader name="Days to show" topPadding={true} />
      <div>
        <span className="mr-2">
          <LinkButton name="select-all" onClick={() => setConfig({ ...config, daysToShow: props.initialDaysToShow })}>
            Select All
          </LinkButton>
        </span>
        <LinkButton name="deselect-all" onClick={() => setConfig({ ...config, daysToShow: [] })}>
          Deselect All
        </LinkButton>
      </div>
      {props.program.weeks.map((week, weekIndex) => {
        return week.days.map((day, i) => {
          const item = (
            <MenuItemEditable
              key={dayIndex}
              name={`Week ${weekIndex + 1}, Day ${i + 1}`}
              type="boolean"
              value={config.daysToShow.includes(dayIndex) ? "true" : "false"}
              onChange={((di) => {
                return (v) => {
                  if (v === "true") {
                    setConfig({ ...config, daysToShow: [...config.daysToShow, di] });
                  } else {
                    setConfig({ ...config, daysToShow: CollectionUtils.remove(config.daysToShow, di) });
                  }
                };
              })(dayIndex)}
            />
          );
          dayIndex += 1;
          return item;
        });
      })}
    </div>
  );
}
