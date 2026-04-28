import { JSX, useState } from "react";
import { View, Pressable, TextInput } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord, IProgram, ISettings } from "../types";
import { INavCommon } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";
import { BuiltinProgramsList } from "./builtinProgramsList";
import { CustomProgramsList } from "./customProgramsList";
import { emptyProgramId, IProgramIndexEntry, Program_selectProgram } from "../models/program";
import { IconMagnifyingGlass } from "./icons/iconMagnifyingGlass";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { LinkButton } from "./linkButton";
import { navigationRef } from "../navigation/navigationRef";

interface IProps {
  dispatch: IDispatch;
  programs: IProgram[];
  programsIndex: IProgramIndexEntry[];
  progress?: IHistoryRecord;
  settings: ISettings;
  customPrograms: IProgram[];
  editProgramId?: string;
  navCommon: INavCommon;
}

export function ChooseProgramView(props: IProps): JSX.Element {
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState(0);
  const hasCustomPrograms = props.customPrograms.length > 0;

  useNavOptions({
    navTitle: "Choose a program",
    navRightButtons: hasCustomPrograms
      ? [
          <LinkButton
            key="import"
            className="px-2 text-sm no-underline"
            name="import-program"
            onClick={() => navigationRef.navigate("importFromLinkModal")}
          >
            Import
          </LinkButton>,
        ]
      : undefined,
  });

  return (
    <View className="flex-1 bg-background-default">
      <View className="px-4 pt-2 pb-2">
        <View className="relative justify-center">
          <View className="absolute z-10 left-3">
            <IconMagnifyingGlass color={Tailwind_semantic().icon.neutralsubtle} size={16} />
          </View>
          <TextInput
            className="w-full py-2 pr-4 text-sm border rounded-lg pl-9 border-border-neutral bg-background-default"
            style={{ fontSize: 15 }}
            placeholder="Search by name"
            placeholderTextColor={Tailwind_semantic().text.secondarysubtle}
            defaultValue=""
            onChangeText={(text) => setSearch(text)}
            data-testid="program-search"
            testID="program-search"
          />
        </View>
      </View>
      {hasCustomPrograms ? (
        <>
          <View className="flex-row border-b border-border-neutral">
            {["Yours", "Built-in"].map((label, index) => (
              <Pressable
                key={label}
                className="items-center flex-1 pb-2"
                onPress={() => setSelectedTab(index)}
                data-testid={`tab-${label.toLowerCase()}`}
                testID={`tab-${label.toLowerCase()}`}
              >
                <Text
                  className={`text-base ${selectedTab === index ? "text-icon-yellow" : ""}`}
                  style={
                    selectedTab === index
                      ? { borderBottomWidth: 2, borderBottomColor: Tailwind_semantic().icon.yellow }
                      : undefined
                  }
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          {selectedTab === 0 ? (
            <CustomProgramsList
              progress={props.progress}
              programs={props.customPrograms}
              settings={props.settings}
              dispatch={props.dispatch}
              search={search}
            />
          ) : (
            <BuiltinProgramsList
              hasCustomPrograms={hasCustomPrograms}
              programs={props.programs}
              programsIndex={props.programsIndex}
              settings={props.settings}
              dispatch={props.dispatch}
              search={search}
            />
          )}
          <Footer
            onCreate={() => navigationRef.navigate("createProgramModal")}
            onEmpty={() => {
              Program_selectProgram(props.dispatch, emptyProgramId);
            }}
          />
        </>
      ) : (
        <BuiltinProgramsList
          hasCustomPrograms={false}
          programs={props.programs}
          programsIndex={props.programsIndex}
          settings={props.settings}
          dispatch={props.dispatch}
          search={search}
        />
      )}
    </View>
  );
}

interface IFooterProps {
  onCreate: () => void;
  onEmpty: () => void;
}

function Footer(props: IFooterProps): JSX.Element {
  return (
    <View className="flex-row items-stretch justify-around px-2 py-4 border-t border-border-neutral bg-background-default">
      <Pressable
        className="items-center justify-center flex-1"
        data-testid="create-program"
        testID="create-program"
        onPress={props.onCreate}
      >
        <Text className="text-sm font-semibold text-text-link">Create New Program</Text>
      </Pressable>
      <View style={{ width: 1 }} className="bg-background-subtle" />
      <Pressable
        className="items-center justify-center flex-1"
        data-testid="empty-program"
        testID="empty-program"
        onPress={props.onEmpty}
      >
        <Text className="text-sm font-semibold text-text-link">Go Without Program</Text>
        <Text className="text-xs text-gray-500">and build your program along the way</Text>
      </Pressable>
    </View>
  );
}
