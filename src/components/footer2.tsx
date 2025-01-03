import { View, TouchableOpacity } from "react-native";
import { Thunk } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { IScreen, Screen } from "../models/screen";
import { FooterButton } from "./footerButton";
import { IconCog2 } from "./icons/iconCog2";
import { IconDoc } from "./icons/iconDoc";
import { IconGraphs2 } from "./icons/iconGraphs2";
import { IconRuler } from "./icons/iconRuler";
import Svg, { Path, Rect } from "react-native-svg";
import { LftText } from "./lftText";

interface IFooterProps {
  dispatch: IDispatch;
  screen: IScreen;
}

export function Footer2View(props: IFooterProps): JSX.Element {
  const activeColor = "#8356F6";
  return (
    <View className="fixed bottom-0 left-0 z-10 items-center w-full text-center" style={{ marginBottom: -2 }}>
      <View className="w-full safe-area-inset-bottom">
        <View className="box-content relative z-10 flex flex-row w-full px-2 pt-2 pb-2 mt-2 bg-white border-t border-grayv2-300">
          <View className="flex flex-row items-end justify-around flex-1 " style={{ marginTop: -10 }}>
            <FooterButton
              name="program"
              screen={props.screen}
              icon={(isActive) => <IconDoc color={isActive ? activeColor : undefined} />}
              text="Program"
              onClick={() => {
                props.dispatch(Thunk.pushToEditProgram());
              }}
            />
            <FooterButton
              name="measurements"
              screen={props.screen}
              icon={(isActive) => <IconRuler color={isActive ? activeColor : undefined} />}
              text="Measures"
              onClick={() => props.dispatch(Thunk.pushScreen("measurements"))}
            />
          </View>
          <View className="relative" style={{ width: 75 }}>
            <View>
              <TouchableOpacity
                className="absolute z-10 nm-footer-workout"
                style={{ top: -22, left: "50%", marginLeft: -27 }}
                onPress={() => props.dispatch(Thunk.pushScreen("main"))}
              >
                <CreateButton isActive={Screen.tab(props.screen) === "workout"} />
              </TouchableOpacity>
              <LftText
                className={Screen.tab(props.screen) === "workout" ? "text-purplev2-700" : ""}
                style={{ fontSize: 11, paddingTop: 35, textAlign: "center" }}
              >
                Workout
              </LftText>
            </View>
          </View>
          <View className="flex flex-row items-end justify-around flex-1" style={{ marginTop: -10 }}>
            <FooterButton
              name="graphs"
              screen={props.screen}
              icon={(isActive) => <IconGraphs2 color={isActive ? activeColor : undefined} />}
              text="Graphs"
              onClick={() => props.dispatch(Thunk.pushScreen("graphs"))}
            />
            <FooterButton
              name="settings"
              screen={props.screen}
              icon={(isActive) => <IconCog2 color={isActive ? activeColor : undefined} />}
              text="Settings"
              onClick={() => props.dispatch(Thunk.pushScreen("settings"))}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function CreateButton(props: { isActive: boolean }): JSX.Element {
  const fill = props.isActive ? "#8356F6" : "#3C5063";
  const stroke = props.isActive ? "#E6DEFC" : "#DFDFDF";
  return (
    <Svg width="54" height="54" viewBox="0 0 54 54" fill="none">
      <Rect x="2" y="2" width="50" height="50" rx="25" fill={fill} stroke={stroke} strokeWidth="4" />
      <Rect x="20.5" y="24.5" width="13" height="5" stroke="white" />
      <Path
        d="M20.0928 22.1617C20.0928 20.8872 19.177 19.854 18.0473 19.854C16.9176 19.854 16.0019 20.8872 16.0019 22.1617L16.0019 31.3924C16.0019 32.667 16.9176 33.7001 18.0473 33.7001C19.177 33.7001 20.0928 32.667 20.0928 31.3924L20.0928 22.1617Z"
        stroke="white"
      />
      <Path
        d="M16.0016 24.4688C16.0016 23.1943 15.0858 22.1611 13.9561 22.1611C12.8264 22.1611 11.9106 23.1943 11.9106 24.4688L11.9106 29.0842C11.9106 30.3587 12.8264 31.3919 13.9561 31.3919C15.0858 31.3919 16.0016 30.3587 16.0016 29.0842L16.0016 24.4688Z"
        stroke="white"
      />
      <Path
        d="M41.9106 24.4688C41.9106 23.1943 40.9948 22.1611 39.8651 22.1611C38.7355 22.1611 37.8197 23.1943 37.8197 24.4688L37.8197 29.0842C37.8197 30.3587 38.7355 31.3919 39.8651 31.3919C40.9948 31.3919 41.9106 30.3587 41.9106 29.0842L41.9106 24.4688Z"
        stroke="white"
      />
      <Path
        d="M37.8199 22.1617C37.8199 20.8872 36.9041 19.854 35.7744 19.854C34.6448 19.854 33.729 20.8872 33.729 22.1617L33.729 31.3924C33.729 32.667 34.6448 33.7001 35.7744 33.7001C36.9041 33.7001 37.8199 32.667 37.8199 31.3925L37.8199 22.1617Z"
        stroke="white"
      />
    </Svg>
  );
}
