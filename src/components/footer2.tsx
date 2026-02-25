import { h, JSX, Fragment } from "preact";
import { Thunk_pushScreen, Thunk_pushToEditProgram, Thunk_startProgramDay } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { Screen_currentName, Screen_tab } from "../models/screen";
import { FooterButton } from "./footerButton";
import { IconGraphs } from "./icons/iconGraphs";
import { IconHome } from "./icons/iconHome";
import { useCallback, useState } from "preact/hooks";
import { IconMe } from "./icons/iconMe";
import { Tailwind_semantic, Tailwind_colors } from "../utils/tailwindConfig";
import { IconDoc2 } from "./icons/iconDoc2";
import { BottomSheetNextWorkout } from "./bottomSheetNextWorkout";
import { INavCommon } from "../models/state";
import { IconBarbell2 } from "./icons/iconBarbell2";
import { ObjectUtils_values } from "../utils/object";
import { Program_evaluate } from "../models/program";
import { Subscriptions_isEligibleForThanksgivingPromo } from "../utils/subscriptions";

interface IFooterProps {
  dispatch: IDispatch;
  navCommon: INavCommon;
}

function getHasErrorsInProgram(navCommon: INavCommon): boolean {
  const program = navCommon.currentProgram;
  if (!program) {
    return false;
  }
  const evaluatedProgram = Program_evaluate(program, navCommon.settings);
  return evaluatedProgram.errors.length > 0;
}

export function Footer2View(props: IFooterProps): JSX.Element {
  const activeColor = Tailwind_semantic().icon.purple;
  const inactiveColor = Tailwind_semantic().icon.neutral;
  const screen = Screen_currentName(props.navCommon.screenStack);
  const [showNextWorkoutSheet, setShowNextWorkoutSheet] = useState(false);
  const onClose = useCallback(() => setShowNextWorkoutSheet(false), []);
  const isUserLoading = ObjectUtils_values(props.navCommon.loading.items).some(
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
          className="box-content absolute flex items-end footer-shadow bg-background-default safe-area-inset-bottom"
          style={{
            width: "4000px",
            marginLeft: "-2000px",
            left: "50%",
            height: "141px",
            bottom: "-76px",
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
              onClick={() => props.dispatch(Thunk_pushScreen("main", undefined, true))}
            />
            <FooterButton
              name="program"
              screen={screen}
              icon={(isActive) => <IconDoc2 className="inline-block" isSelected={isActive} />}
              hasDot={hasErrorsInProgram}
              text="Program"
              onClick={() => {
                props.dispatch(Thunk_pushToEditProgram());
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
                    props.dispatch(Thunk_startProgramDay());
                  } else {
                    setShowNextWorkoutSheet(true);
                  }
                }}
              >
                <CreateButton isActive={Screen_tab(screen) === "workout"} />
              </button>
              <div
                className={Screen_tab(screen) === "workout" ? "text-purplev2-700" : ""}
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
              icon={(isActive) => {
                if (
                  Subscriptions_isEligibleForThanksgivingPromo(
                    props.navCommon.doesHaveWorkouts,
                    props.navCommon.subscription
                  )
                ) {
                  return (
                    <div className="inline-block w-full text-center">
                      <img
                        src="/images/turkeyicon.png"
                        className="inline-block"
                        style={{ width: "24px", height: "24px" }}
                      />
                    </div>
                  );
                } else {
                  return <IconGraphs color={isActive ? activeColor : inactiveColor} />;
                }
              }}
              text={
                Subscriptions_isEligibleForThanksgivingPromo(
                  props.navCommon.doesHaveWorkouts,
                  props.navCommon.subscription
                )
                  ? "Promo"
                  : "Graphs"
              }
              onClick={() => props.dispatch(Thunk_pushScreen("graphs", undefined, true))}
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
              onClick={() => props.dispatch(Thunk_pushScreen("settings", undefined, true))}
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
        stats={props.navCommon.stats}
        onClose={onClose}
      />
    </>
  );
}

function CreateButton(props: { isActive: boolean }): JSX.Element {
  return (
    <div
      className="flex items-center justify-center rounded-full footer-shadow border-background-default bg-button-primarybackground"
      style={{
        width: "53px",
        height: "53px",
        borderWidth: "3px",
        borderStyle: "solid",
      }}
    >
      <IconBarbell2 isSelected={props.isActive} />
    </div>
  );
}
