import { h, JSX } from "preact";
import { Tailwind } from "../../utils/tailwindConfig";

interface IProps {
  style?: { [key: string]: string | number };
  size?: number;
  color?: string;
}

export function IconImportExport(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind.colors().blackv2;
  return (
    <svg
      width={size}
      className="inline-block"
      style={props.style}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.64606 3.35502L5.85606 6.14502C5.53606 6.45502 5.75606 6.99502 6.20606 6.99502H7.99606V13.005C7.99606 13.555 8.44606 14.005 8.99606 14.005C9.54606 14.005 9.99606 13.555 9.99606 13.005V6.99502H11.7861C12.2361 6.99502 12.4561 6.45502 12.1361 6.14502L9.34606 3.35502C9.15606 3.16502 8.83606 3.16502 8.64606 3.35502ZM15.9961 17.015V11.005C15.9961 10.455 15.5461 10.005 14.9961 10.005C14.4461 10.005 13.9961 10.455 13.9961 11.005V17.015H12.2061C11.7561 17.015 11.5361 17.555 11.8561 17.865L14.6461 20.645C14.8461 20.835 15.1561 20.835 15.3561 20.645L18.1461 17.865C18.4661 17.555 18.2361 17.015 17.7961 17.015H15.9961Z"
        fill={color}
      />
    </svg>
  );
}
