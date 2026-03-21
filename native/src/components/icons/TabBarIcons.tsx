import React from "react";
import Svg, { Path } from "react-native-svg";
import { Tailwind_semantic, Tailwind_colors } from "@shared/utils/tailwindConfig";

interface IIconProps {
  color?: string;
  size?: number;
}

export function IconHome({ color, size = 20 }: IIconProps): React.ReactElement {
  color = color ?? Tailwind_semantic().icon.neutral;
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M7 19V12.1528C7 11.5226 7.53726 11.0116 8.2 11.0116H11.8C12.4627 11.0116 13 11.5226 13 12.1528V19M9.30457 1.21117L1.50457 6.48603C1.18802 6.7001 1 7.04665 1 7.41605V17.2882C1 18.2336 1.80589 19 2.8 19H17.2C18.1941 19 19 18.2336 19 17.2882V7.41605C19 7.04665 18.812 6.70011 18.4954 6.48603L10.6954 1.21117C10.2791 0.92961 9.72092 0.929609 9.30457 1.21117Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconHomeSelected({ color, size = 20 }: IIconProps): React.ReactElement {
  color = color ?? Tailwind_semantic().icon.purple;
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M19 17.2882V7.41605C19 7.04665 18.812 6.70011 18.4954 6.48603L10.6954 1.21117C10.2791 0.92961 9.72092 0.929609 9.30457 1.21117L1.50457 6.48603C1.18802 6.7001 1 7.04665 1 7.41605V17.2882C1 18.2336 1.80589 19 2.8 19H5.999V13.0139C5.999 11.6627 6.97364 10.9798 8.04577 10.9798H12.0459C13.0057 10.9798 14.0968 11.5129 14.0968 13.1144V19H17.2C18.1941 19 19 18.2336 19 17.2882Z"
        fill={color}
        stroke={color}
        strokeWidth={1.5}
      />
    </Svg>
  );
}

export function IconDoc({ color, size = 24 }: IIconProps): React.ReactElement {
  color = color ?? Tailwind_semantic().icon.neutral;
  return (
    <Svg width={size} height={size} viewBox="0 0 23 23" fill="none">
      <Path
        d="M19 7L15 3H12H5V12V21H12H19V14V7Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path
        d="M14 3V4C14 5.88562 14 6.82843 14.5858 7.41421C15.1716 8 16.1144 8 18 8H19"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path d="M9 12L15 12" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 16L13 16" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconDocSelected({ color, bgColor, size = 24 }: IIconProps & { bgColor?: string }): React.ReactElement {
  color = color ?? Tailwind_semantic().icon.purple;
  bgColor = bgColor ?? Tailwind_semantic().background.default;
  return (
    <Svg width={size} height={size} viewBox="0 0 23 23" fill="none">
      <Path
        d="M19 7L15 3H12H5V12V21H12H19V14V7Z"
        fill={color}
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path d="M14 4V3L19 8H18C16.1144 8 15.1716 8 14.5858 7.41421C14 6.82843 14 5.88562 14 4Z" fill={bgColor} />
      <Path d="M9 12L15 12" stroke={bgColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 16L13 16" stroke={bgColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconBarbell({ color, size = 30 }: IIconProps): React.ReactElement {
  color = color ?? Tailwind_colors().white;
  const height = size / 2.5;
  return (
    <Svg width={size} height={height} viewBox="0 0 40 17" fill="none" stroke={color} strokeWidth={1.5}>
      <Path d="M34.812 8.5H38.5661" strokeMiterlimit={10} />
      <Path d="M13.238 8.5H26.8286" strokeMiterlimit={10} />
      <Path d="M1.43384 8.5H5.52702" strokeMiterlimit={10} />
      <Path
        d="M13.8624 1.41669V15.5834H10.7683C10.0226 15.5834 9.41797 15.0052 9.41797 14.2921V2.70798C9.41797 1.99483 10.0226 1.41669 10.7683 1.41669L13.8624 1.41669Z"
        strokeMiterlimit={10}
      />
      <Path
        d="M9.41808 4.25V12.75H6.324C5.57823 12.75 4.97363 12.1719 4.97363 11.4587V5.54129C4.97363 4.82814 5.57823 4.25 6.324 4.25H9.41808Z"
        strokeMiterlimit={10}
      />
      <Path
        d="M30.582 2.70798V14.2921C30.582 15.0052 29.9774 15.5834 29.2316 15.5834H26.1376V1.41669L29.2316 1.41669C29.9774 1.41669 30.582 1.99483 30.582 2.70798Z"
        strokeMiterlimit={10}
      />
      <Path
        d="M35.0265 5.54129V11.4587C35.0265 12.1719 34.4219 12.75 33.6761 12.75H30.582V4.25H33.6761C34.4219 4.25 35.0265 4.82814 35.0265 5.54129Z"
        strokeMiterlimit={10}
      />
    </Svg>
  );
}

export function IconBarbellSelected({ color, size = 30 }: IIconProps): React.ReactElement {
  color = color ?? Tailwind_colors().white;
  const height = size / 2.5;
  return (
    <Svg width={size} height={height} viewBox="0 0 40 17" fill="none" stroke={color} strokeWidth={1.5}>
      <Path d="M34.812 8.5H38.5661" strokeMiterlimit={10} />
      <Path d="M13.238 8.5H28.4761" strokeMiterlimit={10} />
      <Path d="M1.43384 8.5H5.52702" strokeMiterlimit={10} />
      <Path
        d="M13.8624 1.41669V15.5834H10.7683C10.0226 15.5834 9.41797 15.0052 9.41797 14.2921V2.70798C9.41797 1.99483 10.0226 1.41669 10.7683 1.41669L13.8624 1.41669Z"
        fill="white"
        strokeMiterlimit={10}
      />
      <Path
        d="M9.41808 4.25V12.75H6.324C5.57823 12.75 4.97363 12.1719 4.97363 11.4587V5.54129C4.97363 4.82814 5.57823 4.25 6.324 4.25H9.41808Z"
        fill="white"
        strokeMiterlimit={10}
      />
      <Path
        d="M30.582 2.70798V14.2921C30.582 15.0052 29.9774 15.5834 29.2316 15.5834H26.1376V1.41669L29.2316 1.41669C29.9774 1.41669 30.582 1.99483 30.582 2.70798Z"
        fill="white"
        strokeMiterlimit={10}
      />
      <Path
        d="M35.0265 5.54129V11.4587C35.0265 12.1719 34.4219 12.75 33.6761 12.75H30.582V4.25H33.6761C34.4219 4.25 35.0265 4.82814 35.0265 5.54129Z"
        fill="white"
        strokeMiterlimit={10}
      />
    </Svg>
  );
}

export function IconGraphs({ color, size = 20 }: IIconProps): React.ReactElement {
  color = color ?? Tailwind_semantic().icon.neutral;
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M1 1V19H19" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M4.16663 16.1667L9.62117 10.4067L12.8598 13.8267L19.1666 7.16675"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4.16663 10.1667L9.62117 4.40675L12.8598 7.82675L19.1666 1.16675"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconMe({ color, size = 24 }: IIconProps): React.ReactElement {
  color = color ?? Tailwind_semantic().icon.neutral;
  return (
    <Svg width={size} height={size} viewBox="0 0 23 23" fill="none">
      <Path
        d="M13.6154 15.9506L12.1148 14.684"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4.96121 10.5659C0.838258 15.7236 2.06397 19.5278 2.06397 19.5278C4.40407 21.2471 8.50406 21.62 11.2106 21.62H16.8184C19.1873 21.5397 21.1064 19.9424 21.1064 16.9673C21.1064 13.6142 18.7045 12.6144 16.5694 12.5375C14.9666 12.5373 13.4865 13.383 12.6913 14.7534L12.5288 15.0332L12.1149 14.6839C10.8944 13.6537 9.09328 13.6537 7.87275 14.6839L7.45884 15.0332L9.01152 11.913"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.32785 11.6487C11.2072 11.6487 13.5414 9.34999 13.5414 6.51436C13.5414 3.67874 11.2072 1.38 8.32785 1.38C5.44848 1.38 3.11429 3.67874 3.11429 6.51436C3.11429 9.34999 5.44848 11.6487 8.32785 11.6487Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.98961 6.51434C8.98961 6.85719 8.7042 7.15465 8.32785 7.15465C7.95151 7.15465 7.66609 6.85719 7.66609 6.51434C7.66609 6.17148 7.95151 5.87402 8.32785 5.87402C8.7042 5.87402 8.98961 6.17148 8.98961 6.51434Z"
        stroke={color}
        strokeWidth={1.5}
      />
    </Svg>
  );
}

export function IconMeSelected({ color, size = 24 }: IIconProps): React.ReactElement {
  color = color ?? Tailwind_semantic().icon.purple;
  return (
    <Svg width={size} height={size} viewBox="0 0 23 23" fill="none">
      <Path
        d="M8.30005 0.5C5.26253 0.5 2.80005 2.96242 2.80005 5.99995C2.80005 9.03748 5.26253 11.5 8.30005 11.5C11.3376 11.5 13.8 9.03758 13.8 5.99995C13.8 2.96231 11.3376 0.5 8.30005 0.5ZM8.30005 7.4415C7.46566 7.4415 6.83301 6.77183 6.83301 6.00005C6.83301 5.22827 7.46577 4.5586 8.30005 4.5586C9.13433 4.5586 9.76719 5.22817 9.76719 6.00005C9.76719 6.77194 9.13443 7.4415 8.30005 7.4415Z"
        fill={color}
      />
      <Path
        d="M16.6388 11.1214H16.6378C15.1977 11.1214 13.8392 11.723 12.8559 12.7388C12.8725 12.7526 12.8911 12.7627 12.9074 12.7768L13.3273 13.139C13.3278 13.1394 13.328 13.1402 13.3286 13.1406L14.4285 14.0908C14.7503 14.3684 14.7899 14.8592 14.5195 15.1874C14.369 15.3698 14.1541 15.4635 13.9383 15.4635C13.765 15.4635 13.5907 15.4032 13.4481 15.2801L11.9271 13.9661C11.3324 13.4538 10.5392 13.2563 9.79198 13.3959C9.77829 13.3989 9.76389 13.403 9.7499 13.4064C9.56819 13.4436 9.39438 13.5178 9.2222 13.5958C8.56928 13.8962 7.08578 14.5966 7.08578 14.5966L7.40245 12.5828C7.36189 12.5774 7.32154 12.5713 7.28118 12.5652C5.77435 12.3447 4.42115 11.6395 3.39172 10.6C0.0801574 15.588 1.15552 19.2258 1.20683 19.3899C1.25631 19.5454 1.35143 19.6816 1.48011 19.7784C4.16765 21.7986 8.72676 22.1 11.2053 22.1L16.9171 22.0995C19.9571 21.9935 22 19.7415 22 16.495C22 13.2531 20.0056 11.2445 16.6388 11.1214Z"
        fill={color}
      />
    </Svg>
  );
}
