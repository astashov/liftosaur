import React, { useMemo, useCallback } from "react";
import { ScrollView, View, Text, Pressable, Switch, StyleSheet, Linking, Platform } from "react-native";
import Slider from "@react-native-community/slider";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStoreState } from "../context/StoreContext";
import { useDispatch } from "../context/DispatchContext";
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
import { FileExport_share } from "../utils/fileExport";
import { FileImport_pickAndRead, FileImport_confirm, docTypes } from "../utils/fileImport";
import type { ISettings, ILengthUnit, IUnit } from "@shared/types";

function GroupHeader({ name }: { name: string }): React.ReactElement {
  const sem = Tailwind_semantic();
  return (
    <View style={styles.groupHeader}>
      <Text style={[styles.groupHeaderText, { color: sem.text.secondary }]}>{name}</Text>
    </View>
  );
}

function MenuItem({
  name,
  value,
  valueColor,
  onPress,
  showArrow = true,
}: {
  name: string;
  value?: string;
  valueColor?: string;
  onPress?: () => void;
  showArrow?: boolean;
}): React.ReactElement {
  const sem = Tailwind_semantic();
  return (
    <Pressable
      style={[styles.menuItem, { borderBottomColor: sem.border.neutral }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={[styles.menuItemName, { color: sem.text.primary }]}>{name}</Text>
      <View style={styles.menuItemRight}>
        {value != null && (
          <Text style={[styles.menuItemValue, { color: valueColor ?? sem.text.secondary }]}>{value}</Text>
        )}
        {showArrow && onPress && <Text style={[styles.menuItemArrow, { color: sem.text.secondary }]}>›</Text>}
      </View>
    </Pressable>
  );
}

function MenuItemToggle({
  name,
  value,
  subtitle,
  onToggle,
}: {
  name: string;
  value: boolean;
  subtitle?: string;
  onToggle: (v: boolean) => void;
}): React.ReactElement {
  const sem = Tailwind_semantic();
  return (
    <View style={[styles.menuItem, { borderBottomColor: sem.border.neutral }]}>
      <View style={styles.toggleLeft}>
        <Text style={[styles.menuItemName, { color: sem.text.primary }]}>{name}</Text>
        {subtitle != null && <Text style={[styles.subtitle, { color: sem.text.secondary }]}>{subtitle}</Text>}
      </View>
      <Switch value={value} onValueChange={onToggle} />
    </View>
  );
}

function MenuItemSelect({
  name,
  value,
  options,
  onSelect,
}: {
  name: string;
  value: string;
  options: [string, string][];
  onSelect: (v: string) => void;
}): React.ReactElement {
  const sem = Tailwind_semantic();
  return (
    <View style={[styles.menuItem, { borderBottomColor: sem.border.neutral }]}>
      <Text style={[styles.menuItemName, { color: sem.text.primary }]}>{name}</Text>
      <View style={styles.segmentedControl}>
        {options.map(([optValue, optLabel]) => {
          const isSelected = optValue === value;
          return (
            <Pressable
              key={optValue}
              style={[
                styles.segmentOption,
                {
                  backgroundColor: isSelected ? sem.button.primarybackground : "transparent",
                  borderColor: sem.border.neutral,
                },
              ]}
              onPress={() => onSelect(optValue)}
            >
              <Text
                style={[
                  styles.segmentOptionText,
                  { color: isSelected ? sem.button.primarylabel : sem.text.primary },
                ]}
              >
                {optLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SettingsScreen(): React.ReactElement {
  const state = useStoreState();
  const dispatch = useDispatch();
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
    (screen: string, params?: unknown) => {
      dispatch({ type: "PushScreen", screen, params } as any);
    },
    [dispatch]
  );

  const updateSettings = useCallback(
    (lensRecording: any, desc: string) => {
      dispatch({ type: "UpdateSettings", lensRecording, desc });
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
    <SafeAreaView style={[styles.root, { backgroundColor: sem.background.default }]} edges={["top"]}>
      <View style={styles.navbar}>
        <Text style={[styles.navTitle, { color: sem.text.primary }]}>Settings</Text>
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Program */}
        <MenuItem name="Program" value={currentProgram?.name} onPress={() => pushScreen("programs")} />

        {/* Account */}
        <GroupHeader name="Account" />
        <MenuItem
          name="Account"
          value={accountValue.text}
          valueColor={accountValue.isError ? sem.text.error : undefined}
          onPress={() => pushScreen("account")}
        />
        <MenuItem name="API Keys" onPress={() => pushScreen("apiKeys")} />

        {/* My Measurements */}
        <GroupHeader name="My Measurements" />
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

        {/* Workout */}
        <GroupHeader name="Workout" />
        <MenuItem name="Exercises" onPress={() => pushScreen("exercises")} />
        <MenuItem name="Muscle Groups" onPress={() => pushScreen("muscleGroups")} />
        <MenuItem name="Timers" onPress={() => pushScreen("timers")} />
        {settings.gyms.length > 1 && (
          <MenuItemSelect
            name="Current Gym"
            value={settings.currentGymId ?? settings.gyms[0].id}
            options={settings.gyms.map((g) => [g.id, g.name] as [string, string])}
            onSelect={(v) => updateSettings(lb<ISettings>().p("currentGymId").record(v), "Change current gym")}
          />
        )}
        <MenuItem
          name="Available Equipment"
          onPress={() => pushScreen(settings.gyms.length > 1 ? "gyms" : "plates")}
        />
        <MenuItemSelect
          name="Weight Units"
          value={settings.units}
          options={[
            ["kg", "kg"],
            ["lb", "lb"],
          ]}
          onSelect={(v) => updateSettings(lb<ISettings>().p("units").record(v as IUnit), "Change weight units")}
        />
        <MenuItemSelect
          name="Length Units"
          value={settings.lengthUnits}
          options={[
            ["cm", "cm"],
            ["in", "in"],
          ]}
          onSelect={(v) =>
            updateSettings(lb<ISettings>().p("lengthUnits").record(v as ILengthUnit), "Change length units")
          }
        />
        <MenuItemSelect
          name="Week starts from"
          value={settings.startWeekFromMonday ? "true" : "false"}
          options={[
            ["false", "Sunday"],
            ["true", "Monday"],
          ]}
          onSelect={(v) =>
            updateSettings(lb<ISettings>().p("startWeekFromMonday").record(v === "true"), "Toggle week start day")
          }
        />
        <MenuItemToggle
          name="Always On Display"
          value={!!settings.alwaysOnDisplay}
          onToggle={(v) =>
            updateSettings(lb<ISettings>().p("alwaysOnDisplay").record(v), "Toggle always-on display")
          }
        />

        {/* Sound */}
        <GroupHeader name="Sound" />
        <MenuItemToggle
          name="Vibration"
          value={!!settings.vibration}
          onToggle={(v) => updateSettings(lb<ISettings>().p("vibration").record(v), "Toggle vibration")}
        />
        <View style={[styles.sliderRow, { borderBottomColor: sem.border.neutral }]}>
          <Text style={[styles.sliderIcon, { color: sem.text.secondary }]}>🔊</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            step={0.01}
            value={settings.volume ?? 1}
            minimumTrackTintColor={sem.button.primarybackground}
            maximumTrackTintColor={sem.border.neutral}
            onValueChange={(v) => updateSettings(lb<ISettings>().p("volume").record(v), "Change volume")}
          />
        </View>

        {/* Sync */}
        {Platform.OS === "ios" && (
          <>
            <GroupHeader name="Sync" />
            <MenuItem name="Apple Health" onPress={() => pushScreen("appleHealth")} />
          </>
        )}
        {Platform.OS === "android" && (
          <>
            <GroupHeader name="Sync" />
            <MenuItem name="Google Health Connect" onPress={() => pushScreen("googleHealth")} />
          </>
        )}

        {/* Appearance */}
        <GroupHeader name="Appearance" />
        <View style={[styles.sliderRow, { borderBottomColor: sem.border.neutral }]}>
          <Text style={[styles.textSizeSmall, { color: sem.text.secondary }]}>A</Text>
          <Slider
            style={styles.slider}
            minimumValue={12}
            maximumValue={20}
            step={2}
            value={settings.textSize ?? 16}
            minimumTrackTintColor={sem.button.primarybackground}
            maximumTrackTintColor={sem.border.neutral}
            onValueChange={(v) => updateSettings(lb<ISettings>().p("textSize").record(v), "Change text size")}
          />
          <Text style={[styles.textSizeLarge, { color: sem.text.secondary }]}>A</Text>
        </View>

        {/* Import / Export */}
        <GroupHeader name="Import / Export" />
        <MenuItem name="Export data to JSON file" showArrow={false} onPress={handleExportJson} />
        <MenuItem name="Export history to CSV file" showArrow={false} onPress={handleExportCsv} />
        <MenuItem name="Export all programs to text file" showArrow={false} onPress={handleExportPrograms} />
        <MenuItem name="Import history from CSV file" showArrow={false} onPress={handleImportCsv} />
        <MenuItem name="Import data from JSON file" showArrow={false} onPress={handleImportJson} />
        <MenuItem name="Import program from JSON file" showArrow={false} onPress={handleImportProgram} />

        {/* Miscellaneous */}
        <GroupHeader name="Miscellaneous" />
        <MenuItem
          name="Contact Us"
          showArrow={false}
          onPress={() => Linking.openURL("mailto:info@liftosaur.com")}
        />
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
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  navbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  groupHeader: {
    paddingTop: 24,
    paddingBottom: 8,
  },
  groupHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemName: {
    fontSize: 16,
    flexShrink: 1,
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    flexShrink: 0,
  },
  menuItemValue: {
    fontSize: 16,
  },
  menuItemArrow: {
    fontSize: 20,
    marginLeft: 4,
    fontWeight: "600",
  },
  toggleLeft: {
    flex: 1,
    marginRight: 12,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
  },
  segmentOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    marginLeft: 4,
  },
  segmentOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  slider: {
    flex: 1,
    marginHorizontal: 8,
  },
  sliderIcon: {
    fontSize: 18,
  },
  textSizeSmall: {
    fontSize: 12,
    fontWeight: "600",
  },
  textSizeLarge: {
    fontSize: 20,
    fontWeight: "600",
  },
  bottomSpacer: {
    height: 32,
  },
});
