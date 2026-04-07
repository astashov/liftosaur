import { JSX } from "react";
import { View, Pressable, Text, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Thunk_pushScreen, Thunk_pushToEditProgram, Thunk_startProgramDay } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { IScreen, Screen_tab } from "../models/screen";
import { FooterButton } from "./footerButton";
import { IconGraphs } from "./icons/iconGraphs";
import { IconHome } from "./icons/iconHome";
import { IconMe } from "./icons/iconMe";
import { Tailwind_semantic, Tailwind_colors } from "../utils/tailwindConfig";
import { IconDoc2 } from "./icons/iconDoc2";
import { INavCommon } from "../models/state";
import { IconBarbell2 } from "./icons/iconBarbell2";
import { ObjectUtils_values } from "../utils/object";
import { Program_evaluate } from "../models/program";
import { navigationRef } from "../navigation/navigationRef";

interface IFooterProps {
  dispatch: IDispatch;
  navCommon: INavCommon;
  screen: IScreen;
}

function getHasErrorsInProgram(navCommon: INavCommon): boolean {
  const program = navCommon.currentProgram;
  if (!program) {
    return false;
  }
  const evaluatedProgram = Program_evaluate(program, navCommon.settings);
  return evaluatedProgram.errors.length > 0;
}

function getNativeShadowStyle(semantic: ReturnType<typeof Tailwind_semantic>): Record<string, unknown> {
  return Platform.select({
    ios: {
      shadowColor: semantic.background.default === "#000000" ? "#fff" : "#000",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    android: { elevation: 4 },
    default: {},
  }) as Record<string, unknown>;
}

export function Footer2View(props: IFooterProps): JSX.Element {
  const semantic = Tailwind_semantic();
  const activeColor = semantic.icon.purple;
  const inactiveColor = semantic.icon.neutral;
  const screen = props.screen;
  const isUserLoading = ObjectUtils_values(props.navCommon.loading.items).some(
    (i) => i?.type === "fetchStorage" && !i.endTime
  );
  const hasErrorsInProgram = getHasErrorsInProgram(props.navCommon);
  const insets = useSafeAreaInsets();
  const nativeShadow = getNativeShadowStyle(semantic);
  return (
    <View
      className="items-center w-full bg-background-default footer-shadow"
      style={[nativeShadow, { paddingBottom: insets.bottom }]}
    >
      <View className={`flex-row w-full px-2 pt-3 ${Platform.OS !== "web" ? "" : "pb-3"}`}>
        <View className="flex-row justify-around flex-1">
          <FooterButton
            name="home"
            screen={screen}
            icon={(isActive) => <IconHome size={20} isSelected={isActive} />}
            text="Home"
            onClick={() => props.dispatch(Thunk_pushScreen("main", undefined, { tab: "home" }))}
          />
          <FooterButton
            name="program"
            screen={screen}
            icon={(isActive) => <IconDoc2 isSelected={isActive} />}
            hasDot={hasErrorsInProgram}
            text="Program"
            onClick={() => {
              props.dispatch(Thunk_pushToEditProgram());
            }}
          />
        </View>
        <View className="items-center w-20">
          <Pressable
            data-cy="footer-workout"
            testID="footer-workout"
            className="mt-[-1.5rem]"
            onPress={() => {
              if (!!props.navCommon.progress) {
                props.dispatch(Thunk_startProgramDay());
              } else {
                navigationRef.navigate("nextWorkoutModal" as never);
              }
            }}
          >
            <CreateButton isActive={Screen_tab(screen) === "workout"} />
          </Pressable>
          <Text
            className={`text-[0.625rem] pt-0.5 ${Screen_tab(screen) === "workout" ? "text-text-purple" : "text-text-secondary"}`}
          >
            Workout
          </Text>
        </View>
        <View className="flex-row justify-around flex-1">
          <FooterButton
            name="graphs"
            screen={screen}
            icon={(isActive) => <IconGraphs color={isActive ? activeColor : inactiveColor} />}
            text="Graphs"
            onClick={() => props.dispatch(Thunk_pushScreen("graphs", undefined, { tab: "graphs" }))}
          />
          <FooterButton
            name="me"
            screen={screen}
            icon={(isActive) => {
              const color = isActive
                ? undefined
                : props.navCommon.userId
                  ? Tailwind_colors().green[600]
                  : isUserLoading
                    ? Tailwind_colors().lightgray[600]
                    : Tailwind_colors().red[600];
              return <IconMe isSelected={isActive} color={color} />;
            }}
            text="Me"
            onClick={() => props.dispatch(Thunk_pushScreen("settings", undefined, { tab: "me" }))}
          />
        </View>
      </View>
    </View>
  );
}

function CreateButton(props: { isActive: boolean }): JSX.Element {
  return (
    <View
      className="items-center justify-center rounded-full bg-button-primarybackground border-background-default footer-shadow"
      style={[{ width: 53, height: 53, borderWidth: 3 }, getNativeShadowStyle(Tailwind_semantic())]}
    >
      <IconBarbell2 isSelected={props.isActive} />
    </View>
  );
}
