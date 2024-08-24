import { h, JSX } from "preact";

interface IIconExternalLinkProps {
  className?: string;
  size?: number;
  color?: string;
}

export function IconExternalLink(props: IIconExternalLinkProps): JSX.Element {
  return (
    <svg
      className={props.className}
      width={props.size || 20}
      height={props.size || 20}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 11V17C16 17.5304 15.7893 18.0391 15.4142 18.4142C15.0391 18.7893 14.5304 19 14 19H3C2.46957 19 1.96086 18.7893 1.58579 18.4142C1.21071 18.0391 1 17.5304 1 17V6C1 5.46957 1.21071 4.96086 1.58579 4.58579C1.96086 4.21071 2.46957 4 3 4H9M13 1H19M19 1V7M19 1L8 12"
        stroke={props.color || "#171718"}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
