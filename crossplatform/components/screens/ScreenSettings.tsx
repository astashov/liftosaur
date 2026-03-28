import React, { useMemo, useCallback } from "react";
import { ScrollView, View, Text, StyleSheet, Linking, Platform } from "react-native";
import Slider from "@react-native-community/slider";
import { SafeAreaView } from "react-native-safe-area-context";
import { lb } from "lens-shmens";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";
import { Stats_getCurrentBodyweight, Stats_getCurrentBodyfat } from "@shared/models/stats";
import { Weight_print } from "@shared/models/weight";
import { Program_getProgram } from "@shared/models/program";
import { StringUtils_truncate } from "@shared/utils/string";
import { History_exportAsCSV } from "@shared/models/history";
import { CSV_toString } from "@shared/utils/csv";
import { DateUtils_formatYYYYMMDD } from "@shared/utils/date";
import { PlannerProgram_generateFullText } from "@shared/pages/planner/models/plannerProgram";
import { Thunk_importStorage, Thunk_importCsvData, Thunk_importProgram } from "@shared/ducks/thunks";
import { FileExport_share } from "../../utils/fileExport";
import { FileImport_pickAndRead, FileImport_confirm, docTypes } from "../../utils/fileImport";
import { GroupHeader } from "../GroupHeader";
import { MenuItem } from "../MenuItem";
import { MenuItemEditable } from "../MenuItemEditable";
import type { ISettings, ILengthUnit, IUnit } from "@shared/types";
import type { IState } from "@shared/models/state";
import type { IDispatch } from "@shared/ducks/types";

interface IProps {
  state: IState;
  dispatch: IDispatch;
}

export function ScreenSettings(props: IProps): React.ReactElement {
  const { state, dispatch } = props;
  const sem = Tailwind_semantic();

  const settings = state.storage.settings;
  const stats = state.storage.stats;
  const user = state.storage.tempUserId ? undefined : state.user;

  const currentProgram = state.storage.currentProgramId
    ? Program_getProgram(state, state.storage.currentProgramId)
    : undefined;

  const currentBodyweight = useMemo(() => Stats_getCurrentBodyweight(stats), [stats]);
  const currentBodyfat = useMemo(() => Stats_getCurrentBodyfat(stats), [stats]);

  const pushScreen = useCallback(
    (screen: string, params?: object) => {
      dispatch({ type: "PushScreen", screen, params });
    },
    [dispatch]
  );

  const handleExportJson = useCallback(async () => {
    const json = JSON.stringify(state.storage, null, 2);
    await FileExport_share(`liftosaur-${DateUtils_formatYYYYMMDD(Date.now())}.json`, json);
  }, [state.storage]);

  const handleExportCsv = useCallback(async () => {
    const csv = CSV_toString(History_exportAsCSV(state.storage.history, settings));
    await FileExport_share(`liftosaur_${DateUtils_formatYYYYMMDD(Date.now())}.csv`, csv);
  }, [state.storage.history, settings]);

  const handleExportPrograms = useCallback(async () => {
    let text = "";
    for (const program of state.storage.programs) {
      if (!program.planner) {
        continue;
      }
      text += `======= ${program.name} =======\n\n`;
      text += PlannerProgram_generateFullText(program.planner.weeks);
      text += `\n\n\n`;
    }
    await FileExport_share(`liftosaur_all_programs_${DateUtils_formatYYYYMMDD(Date.now())}.txt`, text);
  }, [state.storage.programs]);

  const handleImportJson = useCallback(() => {
    FileImport_confirm("Import Data", "Importing new data will wipe out your current data. Are you sure?", async () => {
      const contents = await FileImport_pickAndRead([docTypes.json]);
      if (contents) {
        dispatch(Thunk_importStorage(contents));
      }
    });
  }, [dispatch]);

  const handleImportCsv = useCallback(async () => {
    const contents = await FileImport_pickAndRead([docTypes.csv]);
    if (contents) {
      dispatch(Thunk_importCsvData(contents));
    }
  }, [dispatch]);

  const handleImportProgram = useCallback(async () => {
    const contents = await FileImport_pickAndRead([docTypes.json]);
    if (contents) {
      dispatch(Thunk_importProgram({ decoded: contents }));
    }
  }, [dispatch]);

  const accountValue = useMemo(() => {
    if (user?.email == null) {
      return { text: "Not signed in", isError: true };
    }
    if (user.email === "noemail@example.com") {
      return { text: "Signed In", isError: false };
    }
    return { text: StringUtils_truncate(user.email, 30), isError: false };
  }, [user]);

  return (
    <SafeAreaView className="flex-1 bg-background-default" edges={["top"]}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-xl font-bold text-text-primary">Settings</Text>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="px-4">
        <MenuItem name="Program" value={currentProgram?.name} onPress={() => pushScreen("programs")} />

        <GroupHeader name="Account" topPadding={true} />
        <MenuItem
          name="Account"
          value={accountValue.text}
          valueColor={accountValue.isError ? sem.text.error : undefined}
          onPress={() => pushScreen("account")}
        />
        <MenuItem name="API Keys" onPress={() => pushScreen("apiKeys")} />

        <GroupHeader name="My Measurements" topPadding={true} />
        {currentBodyweight && (
          <MenuItem
            name="Bodyweight"
            value={Weight_print(currentBodyweight)}
            onPress={() => pushScreen("measurements", { key: "weight" })}
          />
        )}
        {currentBodyfat && (
          <MenuItem
            name="Bodyfat"
            value={Weight_print(currentBodyfat)}
            onPress={() => pushScreen("measurements", { key: "bodyfat" })}
          />
        )}
        <MenuItem name="Measurements" onPress={() => pushScreen("measurements")} />

        <GroupHeader name="Workout" topPadding={true} />
        <MenuItem name="Exercises" onPress={() => pushScreen("exercises")} />
        <MenuItem name="Muscle Groups" onPress={() => pushScreen("muscleGroups")} />
        <MenuItem name="Timers" onPress={() => pushScreen("timers")} />
        {settings.gyms.length > 1 && (
          <MenuItemEditable
            type="select"
            name="Current Gym"
            value={settings.currentGymId ?? settings.gyms[0].id}
            options={settings.gyms.map((g) => [g.id, g.name] as [string, string])}
            onChange={(v) =>
              dispatch({
                type: "UpdateSettings",
                lensRecording: lb<ISettings>().p("currentGymId").record(v),
                desc: "Change current gym",
              })
            }
          />
        )}
        <MenuItem name="Available Equipment" onPress={() => pushScreen(settings.gyms.length > 1 ? "gyms" : "plates")} />
        <MenuItemEditable
          type="select"
          name="Weight Units"
          value={settings.units}
          options={[
            ["kg", "kg"],
            ["lb", "lb"],
          ]}
          onChange={(v) =>
            dispatch({
              type: "UpdateSettings",
              lensRecording: lb<ISettings>()
                .p("units")
                .record(v as IUnit),
              desc: "Change weight units",
            })
          }
        />
        <MenuItemEditable
          type="select"
          name="Length Units"
          value={settings.lengthUnits}
          options={[
            ["cm", "cm"],
            ["in", "in"],
          ]}
          onChange={(v) =>
            dispatch({
              type: "UpdateSettings",
              lensRecording: lb<ISettings>()
                .p("lengthUnits")
                .record(v as ILengthUnit),
              desc: "Change length units",
            })
          }
        />
        <MenuItemEditable
          type="select"
          name="Week starts from"
          value={settings.startWeekFromMonday ? "true" : "false"}
          options={[
            ["false", "Sunday"],
            ["true", "Monday"],
          ]}
          onChange={(v) =>
            dispatch({
              type: "UpdateSettings",
              lensRecording: lb<ISettings>()
                .p("startWeekFromMonday")
                .record(v === "true"),
              desc: "Toggle week start day",
            })
          }
        />
        <MenuItemEditable
          type="boolean"
          name="Always On Display"
          value={!!settings.alwaysOnDisplay}
          onChange={(v) =>
            dispatch({
              type: "UpdateSettings",
              lensRecording: lb<ISettings>().p("alwaysOnDisplay").record(v),
              desc: "Toggle always-on display",
            })
          }
        />

        <GroupHeader name="Sound" topPadding={true} />
        <MenuItemEditable
          type="boolean"
          name="Vibration"
          value={!!settings.vibration}
          onChange={(v) =>
            dispatch({
              type: "UpdateSettings",
              lensRecording: lb<ISettings>().p("vibration").record(v),
              desc: "Toggle vibration",
            })
          }
        />
        <View className="flex-row items-center py-3 border-b border-border-neutral">
          <Text className="text-lg text-text-secondary">🔊</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            step={0.01}
            value={settings.volume ?? 1}
            minimumTrackTintColor={sem.button.primarybackground}
            maximumTrackTintColor={sem.border.neutral}
            onValueChange={(v: number) =>
              dispatch({
                type: "UpdateSettings",
                lensRecording: lb<ISettings>().p("volume").record(v),
                desc: "Change volume",
              })
            }
          />
        </View>

        {Platform.OS === "ios" && (
          <>
            <GroupHeader name="Sync" topPadding={true} />
            <MenuItem name="Apple Health" onPress={() => pushScreen("appleHealth")} />
          </>
        )}
        {Platform.OS === "android" && (
          <>
            <GroupHeader name="Sync" topPadding={true} />
            <MenuItem name="Google Health Connect" onPress={() => pushScreen("googleHealth")} />
          </>
        )}

        <GroupHeader name="Appearance" topPadding={true} />
        <View className="flex-row items-center py-3 border-b border-border-neutral">
          <Text className="text-xs font-semibold text-text-secondary">A</Text>
          <Slider
            style={styles.slider}
            minimumValue={12}
            maximumValue={20}
            step={2}
            value={settings.textSize ?? 16}
            minimumTrackTintColor={sem.button.primarybackground}
            maximumTrackTintColor={sem.border.neutral}
            onValueChange={(v: number) =>
              dispatch({
                type: "UpdateSettings",
                lensRecording: lb<ISettings>().p("textSize").record(v),
                desc: "Change text size",
              })
            }
          />
          <Text className="text-xl font-semibold text-text-secondary">A</Text>
        </View>

        <GroupHeader name="Import / Export" topPadding={true} />
        <MenuItem name="Export data to JSON file" showArrow={false} onPress={handleExportJson} />
        <MenuItem name="Export history to CSV file" showArrow={false} onPress={handleExportCsv} />
        <MenuItem name="Export all programs to text file" showArrow={false} onPress={handleExportPrograms} />
        <MenuItem name="Import history from CSV file" showArrow={false} onPress={handleImportCsv} />
        <MenuItem name="Import data from JSON file" showArrow={false} onPress={handleImportJson} />
        <MenuItem name="Import program from JSON file" showArrow={false} onPress={handleImportProgram} />

        <GroupHeader name="Miscellaneous" topPadding={true} />
        <MenuItem name="Contact Us" showArrow={false} onPress={() => Linking.openURL("mailto:info@liftosaur.com")} />
        <MenuItem
          name="Discord Server"
          showArrow={false}
          onPress={() => Linking.openURL("https://discord.com/invite/AAh3cvdBRs")}
        />
        <MenuItem
          name="Privacy Policy"
          showArrow={false}
          onPress={() => Linking.openURL("https://www.liftosaur.com/privacy.html")}
        />
        <MenuItem
          name="Terms & Conditions"
          showArrow={false}
          onPress={() => Linking.openURL("https://www.liftosaur.com/terms.html")}
        />
        <MenuItem
          name="Source Code on Github"
          showArrow={false}
          onPress={() => Linking.openURL("https://github.com/astashov/liftosaur")}
        />
        <MenuItem
          name="Roadmap"
          showArrow={false}
          onPress={() => Linking.openURL("https://github.com/astashov/liftosaur/discussions")}
        />
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  slider: {
    flex: 1,
    marginHorizontal: 8,
  },
});
