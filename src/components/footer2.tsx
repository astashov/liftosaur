import { h, JSX } from "preact";
import { Thunk } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { IScreen, Screen } from "../models/screen";
import { FooterButton } from "./footerButton";
import { IconCog2 } from "./icons/iconCog2";
import { IconDoc } from "./icons/iconDoc";
import { IconGraphs2 } from "./icons/iconGraphs2";
import { IconRuler } from "./icons/iconRuler";

interface IFooterProps {
  dispatch: IDispatch;
  screen: IScreen;
}

export function Footer2View(props: IFooterProps): JSX.Element {
  const activeColor = "#8356F6";
  return (
    <div
      className="fixed bottom-0 left-0 z-10 items-center w-full text-center pointer-events-none"
      style={{ marginBottom: "-2px" }}
    >
      <div
        className="relative flex items-end"
        style={{ width: "1200px", marginLeft: "-600px", left: "50%", height: "60px", marginBottom: "-10px" }}
      >
        <Shadow />
      </div>
      <div
        className="box-content relative z-10 flex px-2 pt-4 bg-white pointer-events-auto safe-area-inset-bottom"
        style={{ minHeight: "54px" }}
      >
        <div className="flex justify-around flex-1" style={{ marginTop: "-10px" }}>
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
        </div>
        <div className="relative" style={{ width: "75px" }}>
          <div>
            <button
              className="absolute"
              data-cy="footer-cta"
              style={{ top: "-27px", left: "50%", marginLeft: "-27px" }}
              onClick={() => props.dispatch(Thunk.pushScreen("main"))}
            >
              <CreateButton isActive={Screen.tab(props.screen) === "workout"} />
            </button>
            <div
              className={Screen.tab(props.screen) === "workout" ? "text-purplev2-700" : "text-grayv2-700"}
              style={{ fontSize: "10px", paddingTop: "30px" }}
            >
              Workout
            </div>
          </div>
        </div>
        <div className="flex justify-around flex-1" style={{ marginTop: "-10px" }}>
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
        </div>
      </div>
    </div>
  );
}

function CreateButton(props: { isActive: boolean }): JSX.Element {
  const fill = props.isActive ? "#8356F6" : "#3C5063";
  const stroke = props.isActive ? "#E6DEFC" : "#DFDFDF";
  return (
    <svg width="54" height="54" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="50" height="50" rx="25" fill={fill} stroke={stroke} stroke-width="4" />
      <rect x="20.5" y="24.5" width="13" height="5" stroke="white" />
      <path
        d="M20.0928 22.1617C20.0928 20.8872 19.177 19.854 18.0473 19.854C16.9176 19.854 16.0019 20.8872 16.0019 22.1617L16.0019 31.3924C16.0019 32.667 16.9176 33.7001 18.0473 33.7001C19.177 33.7001 20.0928 32.667 20.0928 31.3924L20.0928 22.1617Z"
        stroke="white"
      />
      <path
        d="M16.0016 24.4688C16.0016 23.1943 15.0858 22.1611 13.9561 22.1611C12.8264 22.1611 11.9106 23.1943 11.9106 24.4688L11.9106 29.0842C11.9106 30.3587 12.8264 31.3919 13.9561 31.3919C15.0858 31.3919 16.0016 30.3587 16.0016 29.0842L16.0016 24.4688Z"
        stroke="white"
      />
      <path
        d="M41.9106 24.4688C41.9106 23.1943 40.9948 22.1611 39.8651 22.1611C38.7355 22.1611 37.8197 23.1943 37.8197 24.4688L37.8197 29.0842C37.8197 30.3587 38.7355 31.3919 39.8651 31.3919C40.9948 31.3919 41.9106 30.3587 41.9106 29.0842L41.9106 24.4688Z"
        stroke="white"
      />
      <path
        d="M37.8199 22.1617C37.8199 20.8872 36.9041 19.854 35.7744 19.854C34.6448 19.854 33.729 20.8872 33.729 22.1617L33.729 31.3924C33.729 32.667 34.6448 33.7001 35.7744 33.7001C36.9041 33.7001 37.8199 32.667 37.8199 31.3925L37.8199 22.1617Z"
        stroke="white"
      />
    </svg>
  );
}

function Shadow(): JSX.Element {
  return (
    <svg width="1200" height="60" viewBox="0 -30 1200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g filter="url(#filter0_d_0_1)">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M0 22C0 22 504.56 22 535 22C564.072 22 574.069 0 600 0C625.931 0 636.943 22 665 22C694.575 22 1200 22 1200 22V30H0V22Z"
          fill="white"
        />
      </g>
      <defs>
        <filter
          id="filter0_d_0_1"
          x="-25"
          y="-35"
          width="1250"
          height="80"
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
          <feOffset dy="-10" />
          <feGaussianBlur stdDeviation="12.5" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.10 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_0_1" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_0_1" result="shape" />
        </filter>
      </defs>
    </svg>
  );
}
