import { h, JSX } from "preact";
import { GroupHeader } from "../../../components/groupHeader";
import { Modal } from "../../../components/modal";
import { IPlannerProgram, IProgram, ISettings } from "../../../types";
import { IProgramShareOutputOptions, ProgramShareOutput } from "../../../components/programShareOutput";
import { Button } from "../../../components/button";
import * as htmlToImage from "html-to-image";
import { Ref, useEffect, useRef, useState } from "preact/hooks";
import { IconSpinner } from "../../../components/icons/iconSpinner";
import { MenuItemEditable } from "../../../components/menuItemEditable";
import { CollectionUtils } from "../../../utils/collection";
import { LinkButton } from "../../../components/linkButton";
import { StringUtils } from "../../../utils/string";
import { ImageShareUtils } from "../../../utils/imageshare";
import { ScrollableTabs } from "../../../components/scrollableTabs";
import { Program } from "../../../models/program";

interface IModalPlannerPictureExportProps {
  settings: ISettings;
  client: Window["fetch"];
  program: IProgram;
  isChanged: boolean;
  url?: string;
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
  const planner = props.program.planner!;
  const [url, setUrl] = useState(!props.isChanged && props.url ? props.url : undefined);

  const initialDaysToShow = getInitialDaysToShow(planner);
  const [config, setConfig] = useState<IProgramShareOutputOptions>({
    showInfo: true,
    showDayDescription: true,
    showWeekDescription: true,
    showQRCode: true,
    columns: 1,
    daysToShow: initialDaysToShow,
  });

  useEffect(() => {
    new Promise(async (resolve) => {
      if (url == null) {
        const url = await Program.toUrl(props.program, props.settings, props.client);
        setUrl(url);
        resolve(void 0);
      }
    });
  }, []);

  return (
    <Modal shouldShowClose={true} onClose={props.onClose} noPaddings={true}>
      <div className="relative w-full h-px overflow-hidden">
        <div className="absolute" style={{ top: "9999px", left: "9999px" }}>
          <ProgramShareOutput ref={sourceRef} settings={props.settings} program={planner} options={config} url={url} />
        </div>
      </div>
      <div className="relative z-0 block px-4 pt-2 sm:hidden" style={{ minWidth: "20rem" }}>
        <ScrollableTabs
          defaultIndex={0}
          tabs={[
            {
              label: "Settings",
              children: (
                <div>
                  <SettingsTab
                    program={planner}
                    initialDaysToShow={initialDaysToShow}
                    sourceRef={sourceRef}
                    config={config}
                    setConfig={setConfig}
                  />
                </div>
              ),
            },
            {
              label: "Preview",
              children: (
                <div className="overflow-x-auto" style={{ marginLeft: "-1rem", marginRight: "-1rem" }}>
                  <ProgramShareOutput settings={props.settings} program={planner} options={config} url={url} />
                </div>
              ),
            },
          ]}
        />
      </div>
      <div className="hidden sm:flex">
        <div
          className="p-4 border-r bg-grayv2-50 border-grayv2-200"
          style={{ borderRadius: "0.5rem 0 0 0.5rem", minWidth: "16rem" }}
        >
          <SettingsTab
            program={planner}
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
            <ProgramShareOutput settings={props.settings} program={planner} options={config} url={url} />
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

function getWeekDayMapping(program: IPlannerProgram): Record<number, Record<number, number>> {
  let dayIndex = 0;
  return program.weeks.reduce<Record<number, Record<number, number>>>((acc, week, weekIndex) => {
    week.days.forEach((day, dayInWeekIndex) => {
      acc[weekIndex] = acc[weekIndex] || {};
      acc[weekIndex][dayInWeekIndex] = dayIndex;
      dayIndex += 1;
    });
    return acc;
  }, {});
}

function SettingsTab(props: ISettingsTabProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const { config, setConfig, sourceRef } = props;

  function save(): void {
    const maxSize = 16384;
    const width = sourceRef.current.clientWidth;
    const height = sourceRef.current.clientHeight;
    console.log(`${width}x${height}`);
    if (width >= maxSize || height >= maxSize) {
      alert(
        `The image is too large to generate - max size is 16384x16384, and the image would be ${width}x${height}. Try to set more columns, or disable some weeks/days.`
      );
      return;
    }
    setIsLoading(true);
    htmlToImage
      .toPng(sourceRef.current, {
        pixelRatio: 2,
      })
      .then((dataUrl) => {
        setIsLoading(false);
        const filename = StringUtils.dashcase(props.program.name) + ".png";
        const imageShareUtils = new ImageShareUtils(dataUrl, filename);
        imageShareUtils.shareOrDownload();
      })
      .catch((error) => {
        setIsLoading(false);
        console.error(error);
        alert(
          "Unknown error happened. Likely because the image is too large to generate. Try to disable some weeks/days."
        );
      });
  }
  const weekDayMapping = getWeekDayMapping(props.program);

  return (
    <div>
      <div className="my-2 text-center">
        <Button
          disabled={isLoading}
          name="export-program-picture"
          kind="orange"
          className="w-48"
          onClick={() => save()}
        >
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
        name="Include QR Code"
        type="boolean"
        value={config.showQRCode ? "true" : "false"}
        onChange={(v) => setConfig({ ...config, showQRCode: v === "true" })}
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
      <div className="text-sm">
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
        const dayIndexes = week.days.map((_, i) => weekDayMapping[weekIndex][i]);
        const allDaysSelected = dayIndexes.every((di) => config.daysToShow.includes(di));
        return (
          <div>
            <MenuItemEditable
              key={weekIndex}
              name={`Week ${weekIndex + 1}`}
              type="boolean"
              value={allDaysSelected ? "true" : "false"}
              onChange={(v) => {
                if (v === "true") {
                  setConfig({ ...config, daysToShow: Array.from(new Set([...config.daysToShow, ...dayIndexes])) });
                } else {
                  setConfig({ ...config, daysToShow: CollectionUtils.removeAll(config.daysToShow, dayIndexes) });
                }
              }}
            />
            {week.days.map((_, i) => {
              const dayIndex = weekDayMapping[weekIndex][i];
              const daySelected = config.daysToShow.includes(dayIndex);
              return (
                <MenuItemEditable
                  key={dayIndex}
                  prefix={<span className="inline-block w-4" />}
                  name={`• Day ${i + 1}`}
                  type="boolean"
                  value={daySelected ? "true" : "false"}
                  onChange={(v) => {
                    if (v === "true") {
                      setConfig({ ...config, daysToShow: Array.from(new Set([...config.daysToShow, dayIndex])) });
                    } else {
                      setConfig({ ...config, daysToShow: CollectionUtils.remove(config.daysToShow, dayIndex) });
                    }
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
