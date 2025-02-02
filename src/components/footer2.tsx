import { h, JSX, Fragment } from "preact";
import { Thunk } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { Screen } from "../models/screen";
import { FooterButton } from "./footerButton";
import { IconGraphs } from "./icons/iconGraphs";
import { IconHome } from "./icons/iconHome";
import { useState } from "preact/hooks";
import { IconMe } from "./icons/iconMe";
import { Tailwind } from "../utils/tailwindConfig";
import { IconDoc2 } from "./icons/iconDoc2";
import { BottomSheetNextWorkout } from "./bottomSheetNextWorkout";
import { INavCommon } from "../models/state";
import { IconBarbell2 } from "./icons/iconBarbell2";

interface IFooterProps {
  dispatch: IDispatch;
  navCommon: INavCommon;
}

export function Footer2View(props: IFooterProps): JSX.Element {
  const activeColor = Tailwind.colors().purplev2.main;
  const inactiveColor = Tailwind.colors().grayv2["800"];
  const screen = Screen.currentName(props.navCommon.screenStack);
  const [showNextWorkoutSheet, setShowNextWorkoutSheet] = useState(false);
  return (
    <>
      <div
        className="fixed bottom-0 left-0 z-10 items-center w-full text-center pointer-events-none"
        style={{ marginBottom: "-2px" }}
      >
        <div
          className="absolute flex items-end"
          style={{ width: "4000px", marginLeft: "-2000px", left: "50%", height: "83px", bottom: "-11px" }}
        >
          <Shape />
        </div>
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
                    props.dispatch(Thunk.pushScreen("progress", undefined, true));
                  } else {
                    setShowNextWorkoutSheet(true);
                  }
                }}
              >
                <CreateButton isActive={Screen.tab(screen) === "workout"} />
              </button>
              <div
                className={Screen.tab(screen) === "workout" ? "text-purplev2-700" : ""}
                style={{ fontSize: "10px", paddingTop: "30px" }}
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
              icon={(isActive) => <IconMe isSelected={isActive} />}
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
        onClose={() => setShowNextWorkoutSheet(false)}
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

function Shape(): JSX.Element {
  return (
    <svg width="4000" height="83" viewBox="0 0 4000 83" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g filter="url(#filter0_d_1724_917)">
        <path
          d="M1999.5 48.7455C2016.62 48.7455 2030.5 34.8664 2030.5 17.7455C2030.5 15.3048 2030.22 12.93 2029.69 10.6519C2029.02 7.80811 2030.99 4.74554 2033.91 4.74554H3995.99C3998.19 4.74554 3999.99 6.53641 3999.99 8.74554V74.7455C3999.99 76.9547 3998.19 78.7455 3995.99 78.7455H4.03124C1.8221 78.7455 0.03125 76.9547 0.03125 74.7455V8.74555C0.03125 6.53641 1.82211 4.74554 4.03125 4.74554L1931.89 4.74554H1965.09C1968.01 4.74554 1969.98 7.80811 1969.32 10.6519C1968.78 12.93 1968.5 15.3048 1968.5 17.7455C1968.5 34.8664 1982.38 48.7455 1999.5 48.7455Z"
          fill="white"
        />
      </g>
      <defs>
        <filter
          id="filter0_d_1724_917"
          x="-3.96875"
          y="0.745544"
          width="4007.95"
          height="82"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="2" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1724_917" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1724_917" result="shape" />
        </filter>
      </defs>
    </svg>
  );
}
