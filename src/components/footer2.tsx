import { h, JSX, ComponentChildren } from "preact";
import { IDispatch } from "../ducks/types";

interface IFooterProps {
  dispatch: IDispatch;
  onCtaClick?: () => void;
  leftButtons?: ComponentChildren;
  rightButtons?: ComponentChildren;
  ctaTitle?: string;
}

export function Footer2View(props: IFooterProps): JSX.Element {
  return (
    <div
      className="fixed bottom-0 left-0 z-10 items-center w-full text-center pointer-events-none"
      style={{ marginBottom: "-2px" }}
    >
      {props.onCtaClick != null ? (
        <div
          className="relative flex items-end"
          style={{ width: "1200px", marginLeft: "-600px", left: "50%", height: "60px", marginBottom: "-10px" }}
        >
          <Shadow />
        </div>
      ) : null}
      <div
        className="relative z-10 flex px-2 pt-4 pb-2 bg-white pointer-events-auto"
        style={{ minHeight: "70px", boxShadow: props.onCtaClick ? "" : "0px -10px 25px rgba(0, 0, 0, 0.05)" }}
      >
        <div className="flex justify-around flex-1" style={{ marginTop: "-10px" }}>
          {props.leftButtons}
        </div>
        <div className="relative" style={{ width: "100px" }}>
          {props.onCtaClick != null ? (
            <div>
              <button
                className="absolute"
                style={{ top: "-27px", left: "50%", marginLeft: "-27px" }}
                onClick={props.onCtaClick}
              >
                <CreateButton />
              </button>
              {props.ctaTitle ? (
                <div className="text-grayv2-700" style={{ fontSize: "10px", paddingTop: "30px" }}>
                  {props.ctaTitle}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex justify-around flex-1" style={{ marginTop: "-10px" }}>
          {props.rightButtons}
        </div>
      </div>
    </div>
  );
}

function CreateButton(): JSX.Element {
  return (
    <svg width="54" height="54" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="50" height="50" rx="25" fill="#8356F6" stroke="#E6DEFC" stroke-width="4" />
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M27 19C27.8837 19 28.6 19.7163 28.6 20.6V25.4H33.4C34.2837 25.4 35 26.1163 35 27C35 27.8837 34.2836 28.6 33.4 28.6H28.6V33.4C28.6 34.2837 27.8837 35 27 35C26.1163 35 25.4 34.2837 25.4 33.4V28.6H20.6C19.7163 28.6 19 27.8837 19 27C19 26.1163 19.7163 25.4 20.6 25.4H25.4V20.6C25.4 19.7163 26.1163 19 27 19Z"
        fill="white"
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
