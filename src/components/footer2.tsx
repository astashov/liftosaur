import { h, JSX, Fragment } from "preact";
import { Thunk } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { Screen } from "../models/screen";
import { FooterButton } from "./footerButton";
import { IconGraphs } from "./icons/iconGraphs";
import { IconHome } from "./icons/iconHome";
import { useCallback, useState } from "preact/hooks";
import { IconMe } from "./icons/iconMe";
import { Tailwind } from "../utils/tailwindConfig";
import { IconDoc2 } from "./icons/iconDoc2";
import { BottomSheetNextWorkout } from "./bottomSheetNextWorkout";
import { INavCommon } from "../models/state";
import { IconBarbell2 } from "./icons/iconBarbell2";
import { ObjectUtils } from "../utils/object";
import { Program } from "../models/program";

interface IFooterProps {
  dispatch: IDispatch;
  navCommon: INavCommon;
}

function getHasErrorsInProgram(navCommon: INavCommon): boolean {
  const program = navCommon.currentProgram;
  if (!program) {
    return false;
  }
  const evaluatedProgram = Program.evaluate(program, navCommon.settings);
  return evaluatedProgram.errors.length > 0;
}

export function Footer2View(props: IFooterProps): JSX.Element {
  const activeColor = Tailwind.colors().purplev2.main;
  const inactiveColor = Tailwind.colors().grayv2["800"];
  const screen = Screen.currentName(props.navCommon.screenStack);
  const [showNextWorkoutSheet, setShowNextWorkoutSheet] = useState(false);
  const onClose = useCallback(() => setShowNextWorkoutSheet(false), []);
  const isUserLoading = ObjectUtils.values(props.navCommon.loading.items).some(
    (i) => i?.type === "fetchStorage" && !i.endTime
  );
  const hasErrorsInProgram = getHasErrorsInProgram(props.navCommon);
  return (
    <>
      <div
        className="fixed bottom-0 left-0 z-10 items-center w-full text-center pointer-events-none"
        style={{ marginBottom: "-2px" }}
      >
        <div
          className="box-content absolute flex items-end bg-white safe-area-inset-bottom"
          style={{
            width: "4000px",
            marginLeft: "-2000px",
            left: "50%",
            height: "141px",
            bottom: "-76px",
            boxShadow: "0 0 4px 0 rgba(0, 0, 0, 0.2)",
          }}
        />
        <div
          className="box-content relative z-10 flex px-2 pt-4 pointer-events-auto safe-area-inset-bottom"
          style={{ minHeight: "54px" }}
        >
          <div className="flex justify-around flex-1" style={{ marginTop: "-10px" }}>
            <FooterButton
              name="home"
              screen={screen}
              icon={(isActive) => <IconHome className="inline-block" size={20} isSelected={isActive} />}
              text="Home"
              onClick={() => props.dispatch(Thunk.pushScreen("main", undefined, true))}
            />
            <FooterButton
              name="program"
              screen={screen}
              icon={(isActive) => <IconDoc2 className="inline-block" isSelected={isActive} />}
              hasDot={hasErrorsInProgram}
              text="Program"
              onClick={() => {
                props.dispatch(Thunk.pushToEditProgram());
              }}
            />
          </div>
          <div className="relative" style={{ width: "75px" }}>
            <div>
              <button
                className="absolute nm-footer-workout"
                data-cy="footer-workout"
                style={{ top: "-27px", left: "50%", marginLeft: "-27px" }}
                onClick={() => {
                  if (!!props.navCommon.progress) {
                    props.dispatch({ type: "StartProgramDayAction" });
                  } else {
                    setShowNextWorkoutSheet(true);
                  }
                }}
              >
                <CreateButton isActive={Screen.tab(screen) === "workout"} />
              </button>
              <div
                className={Screen.tab(screen) === "workout" ? "text-purplev2-700" : ""}
                style={{ fontSize: "0.625rem", paddingTop: "30px" }}
              >
                Workout
              </div>
            </div>
          </div>
          <div className="flex justify-around flex-1" style={{ marginTop: "-10px" }}>
            <FooterButton
              name="graphs"
              screen={screen}
              icon={(isActive) => <IconGraphs color={isActive ? activeColor : inactiveColor} />}
              text="Graphs"
              onClick={() => props.dispatch(Thunk.pushScreen("graphs", undefined, true))}
            />
            <FooterButton
              name="me"
              screen={screen}
              icon={(isActive) => {
                const color = isActive
                  ? undefined
                  : props.navCommon.userId
                    ? Tailwind.colors().greenv3[600]
                    : isUserLoading
                      ? Tailwind.colors().grayv3.main
                      : Tailwind.colors().redv3[600];
                return <IconMe isSelected={isActive} color={color} />;
              }}
              text="Me"
              onClick={() => props.dispatch(Thunk.pushScreen("settings", undefined, true))}
            />
          </div>
        </div>
      </div>
      <BottomSheetNextWorkout
        dispatch={props.dispatch}
        allPrograms={props.navCommon.allPrograms}
        currentProgram={props.navCommon.currentProgram}
        settings={props.navCommon.settings}
        isHidden={!showNextWorkoutSheet}
        onClose={onClose}
      />
    </>
  );
}

function CreateButton(props: { isActive: boolean }): JSX.Element {
  return (
    <div
      className="flex items-center justify-center border-white rounded-full bg-purplev3-main"
      style={{
        width: "53px",
        height: "53px",
        borderWidth: "3px",
        borderStyle: "solid",
        boxShadow: "0 0 4px 0 rgba(0, 0, 0, 0.2)",
      }}
    >
      <IconBarbell2 isSelected={props.isActive} />
    </div>
  );
}
