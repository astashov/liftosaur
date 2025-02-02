import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IInnerProps {
  size?: number;
  color?: string;
  className?: string;
}

interface IProps extends IInnerProps {
  isSelected?: boolean;
}

export function IconBarbell2(props: IProps): JSX.Element {
  const { isSelected, ...rest } = props;
  return isSelected ? <IconBarbell2Selected {...rest} /> : <IconBarbell2Unselected {...rest} />;
}

export function IconBarbell2Unselected(props: IInnerProps): JSX.Element {
  const width = props.size ?? 40;
  const height = width / 2.5;
  const color = props.color ?? Tailwind.colors().white;
  return (
    <svg
      width={width}
      height={height}
      className={props.className}
      viewBox="0 0 40 17"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M34.812 8.5H38.5661" stroke-miterlimit="10" />
      <path d="M13.238 8.5H26.8286" stroke-miterlimit="10" />
      <path d="M1.43384 8.5H5.52702" stroke-miterlimit="10" />
      <path
        d="M13.8624 1.41669V15.5834H10.7683C10.0226 15.5834 9.41797 15.0052 9.41797 14.2921V2.70798C9.41797 1.99483 10.0226 1.41669 10.7683 1.41669L13.8624 1.41669Z"
        stroke-miterlimit="10"
      />
      <path
        d="M9.41808 4.25V12.75H6.324C5.57823 12.75 4.97363 12.1719 4.97363 11.4587V5.54129C4.97363 4.82814 5.57823 4.25 6.324 4.25H9.41808Z"
        stroke-miterlimit="10"
      />
      <path
        d="M30.582 2.70798V14.2921C30.582 15.0052 29.9774 15.5834 29.2316 15.5834H26.1376V1.41669L29.2316 1.41669C29.9774 1.41669 30.582 1.99483 30.582 2.70798Z"
        stroke-miterlimit="10"
      />
      <path
        d="M35.0265 5.54129V11.4587C35.0265 12.1719 34.4219 12.75 33.6761 12.75H30.582V4.25H33.6761C34.4219 4.25 35.0265 4.82814 35.0265 5.54129Z"
        stroke-miterlimit="10"
      />
    </svg>
  );
}

export function IconBarbell2Selected(props: IInnerProps): JSX.Element {
  const width = props.size ?? 40;
  const height = width / 2.5;
  const color = props.color ?? Tailwind.colors().white;
  return (
    <svg
      width={width}
      height={height}
      className={props.className}
      viewBox="0 0 40 17"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M34.812 8.5H38.5661" stroke-miterlimit="10" />
      <path d="M13.238 8.5H28.4761" stroke-miterlimit="10" />
      <path d="M1.43384 8.5H5.52702" stroke-miterlimit="10" />
      <path
        d="M13.8624 1.41669V15.5834H10.7683C10.0226 15.5834 9.41797 15.0052 9.41797 14.2921V2.70798C9.41797 1.99483 10.0226 1.41669 10.7683 1.41669L13.8624 1.41669Z"
        fill="white"
        stroke-miterlimit="10"
      />
      <path
        d="M9.41808 4.25V12.75H6.324C5.57823 12.75 4.97363 12.1719 4.97363 11.4587V5.54129C4.97363 4.82814 5.57823 4.25 6.324 4.25H9.41808Z"
        fill="white"
        stroke-miterlimit="10"
      />
      <path
        d="M30.582 2.70798V14.2921C30.582 15.0052 29.9774 15.5834 29.2316 15.5834H26.1376V1.41669L29.2316 1.41669C29.9774 1.41669 30.582 1.99483 30.582 2.70798Z"
        fill="white"
        stroke-miterlimit="10"
      />
      <path
        d="M35.0265 5.54129V11.4587C35.0265 12.1719 34.4219 12.75 33.6761 12.75H30.582V4.25H33.6761C34.4219 4.25 35.0265 4.82814 35.0265 5.54129Z"
        fill="white"
        stroke-miterlimit="10"
      />
    </svg>
  );
}
