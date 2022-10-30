import { h, JSX } from "preact";

interface IProps {
  style?: { [key: string]: string | number };
}

export function IconArrowRight(props: IProps): JSX.Element {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1L6 6L1 11" stroke="#818385" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}
