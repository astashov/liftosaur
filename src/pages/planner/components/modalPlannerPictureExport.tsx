import { JSX, useEffect, useRef, useState } from "react";
import { View, ScrollView, useWindowDimensions, LayoutChangeEvent } from "react-native";
import { GroupHeader } from "../../../components/groupHeader";
import { Dialog_alert } from "../../../utils/dialog";
import { Modal } from "../../../components/modal";
import { IPlannerProgram, IProgram, ISettings } from "../../../types";
import { IProgramShareOutputOptions, ProgramShareOutput } from "../../../components/programShareOutput";
import { Button } from "../../../components/button";
import { IconSpinner } from "../../../components/icons/iconSpinner";
import { MenuItemEditable } from "../../../components/menuItemEditable";
import { CollectionUtils_removeAll, CollectionUtils_remove } from "../../../utils/collection";
import { LinkButton } from "../../../components/linkButton";
import { StringUtils_dashcase } from "../../../utils/string";
import { ImageShareUtils } from "../../../utils/imageshare";
import { ScrollableTabs } from "../../../components/scrollableTabs";
import { Program_toUrl } from "../../../models/program";

interface IModalPlannerPictureExportProps {
  settings: ISettings;
  client: Window["fetch"];
  userId?: string;
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

export function ModalPlannerPictureExportContent(props: IModalPlannerPictureExportProps): JSX.Element {
  const sourceRef = useRef<View>(null);
  const sourceSizeRef = useRef<{ width: number; height: number } | undefined>(undefined);
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
    if (url == null) {
      Program_toUrl(props.program, props.settings, props.client, props.userId).then((url2) => {
        setUrl(url2);
      });
    }
  }, []);

  const { width } = useWindowDimensions();
  const isWide = width >= 640;

  const onSourceLayout = (e: LayoutChangeEvent): void => {
    sourceSizeRef.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
  };

  const offscreenSource = (
    <View
      collapsable={false}
      style={{ position: "absolute", left: 0, top: 0, opacity: 0 }}
      pointerEvents="none"
      onLayout={onSourceLayout}
    >
      <ProgramShareOutput ref={sourceRef} settings={props.settings} program={planner} options={config} url={url} />
    </View>
  );

  const settingsTab = (
    <SettingsTab
      program={planner}
      initialDaysToShow={initialDaysToShow}
      sourceRef={sourceRef}
      sourceSizeRef={sourceSizeRef}
      programName={props.program.name}
      config={config}
      setConfig={setConfig}
    />
  );

  const preview = <ProgramShareOutput settings={props.settings} program={planner} options={config} url={url} />;

  if (isWide) {
    return (
      <View className="flex-row flex-1">
        {offscreenSource}
        <View
          className="p-4 border-r bg-background-subtle border-border-neutral"
          style={{ borderTopLeftRadius: 8, borderBottomLeftRadius: 8, minWidth: 256 }}
        >
          <ScrollView>{settingsTab}</ScrollView>
        </View>
        <View className="flex-1" style={{ minWidth: 384 }}>
          <ScrollView contentContainerClassName="pb-4">
            <View className="px-4 py-2">
              <GroupHeader size="large" name="Preview" />
            </View>
            <ScrollView horizontal>{preview}</ScrollView>
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {offscreenSource}
      <ScrollableTabs
        defaultIndex={0}
        tabs={[
          {
            label: "Settings",
            children: () => <View className="px-4 pt-2">{settingsTab}</View>,
          },
          {
            label: "Preview",
            children: () => (
              <ScrollView horizontal>
                <View>{preview}</View>
              </ScrollView>
            ),
          },
        ]}
      />
    </View>
  );
}

export function ModalPlannerPictureExport(props: IModalPlannerPictureExportProps): JSX.Element {
  return (
    <Modal shouldShowClose={true} onClose={props.onClose} noPaddings={true}>
      <ModalPlannerPictureExportContent {...props} />
    </Modal>
  );
}

interface ISettingsTabProps {
  program: IPlannerProgram;
  initialDaysToShow: number[];
  sourceRef: React.RefObject<View | null>;
  sourceSizeRef: React.RefObject<{ width: number; height: number } | undefined>;
  programName: string;
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
  const { config, setConfig, sourceRef, sourceSizeRef } = props;

  async function save(): Promise<void> {
    const maxSize = 16384;
    const size = sourceSizeRef.current;
    if (size && (size.width >= maxSize || size.height >= maxSize)) {
      Dialog_alert(
        `The image is too large to generate - max size is 16384x16384, and the image would be ${size.width}x${size.height}. Try to set more columns, or disable some weeks/days.`
      );
      return;
    }
    setIsLoading(true);
    try {
      const dataUrl = await ImageShareUtils.generateImageDataUrl(sourceRef);
      const filename = StringUtils_dashcase(props.programName) + ".png";
      const imageShareUtils = new ImageShareUtils(dataUrl, filename);
      await imageShareUtils.shareOrDownload();
    } catch (error) {
      console.error(error);
      Dialog_alert(
        "Unknown error happened. Likely because the image is too large to generate. Try to disable some weeks/days."
      );
    } finally {
      setIsLoading(false);
    }
  }
  const weekDayMapping = getWeekDayMapping(props.program);

  return (
    <View>
      <View className="flex-row items-center justify-center my-2">
        <Button
          disabled={isLoading}
          name="export-program-picture"
          kind="purple"
          className="w-48"
          onClick={() => save()}
        >
          {isLoading ? <IconSpinner width={12} height={12} color="white" /> : "Generate image"}
        </Button>
      </View>
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
      <View className="flex-row gap-2">
        <View>
          <LinkButton
            className="text-sm"
            name="select-all"
            onClick={() => setConfig({ ...config, daysToShow: props.initialDaysToShow })}
          >
            Select All
          </LinkButton>
        </View>
        <View>
          <LinkButton className="text-sm" name="deselect-all" onClick={() => setConfig({ ...config, daysToShow: [] })}>
            Deselect All
          </LinkButton>
        </View>
      </View>
      {props.program.weeks.map((week, weekIndex) => {
        const dayIndexes = week.days.map((_, i) => weekDayMapping[weekIndex][i]);
        const allDaysSelected = dayIndexes.every((di) => config.daysToShow.includes(di));
        return (
          <View key={weekIndex}>
            <MenuItemEditable
              name={`Week ${weekIndex + 1}`}
              type="boolean"
              value={allDaysSelected ? "true" : "false"}
              onChange={(v) => {
                if (v === "true") {
                  setConfig({ ...config, daysToShow: Array.from(new Set([...config.daysToShow, ...dayIndexes])) });
                } else {
                  setConfig({ ...config, daysToShow: CollectionUtils_removeAll(config.daysToShow, dayIndexes) });
                }
              }}
            />
            {week.days.map((_, i) => {
              const dayIndex = weekDayMapping[weekIndex][i];
              const daySelected = config.daysToShow.includes(dayIndex);
              return (
                <MenuItemEditable
                  key={dayIndex}
                  prefix={<View className="w-4" />}
                  name={`• Day ${i + 1}`}
                  type="boolean"
                  value={daySelected ? "true" : "false"}
                  onChange={(v) => {
                    if (v === "true") {
                      setConfig({ ...config, daysToShow: Array.from(new Set([...config.daysToShow, dayIndex])) });
                    } else {
                      setConfig({ ...config, daysToShow: CollectionUtils_remove(config.daysToShow, dayIndex) });
                    }
                  }}
                />
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
