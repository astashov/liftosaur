import { h, JSX } from "preact";

interface IProps {
  style: { [key: string]: string | number };
}

export function IconArrowRight(props: IProps): JSX.Element {
  return (
    <svg style={props.style} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path d="M5 3l3.057-3 11.943 12-11.943 12-3.057-3 9-9z" />
    </svg>
  );
}
