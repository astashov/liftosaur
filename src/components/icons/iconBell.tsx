import { h, JSX } from "preact";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  color?: string;
}

export function IconBell(props: IProps): JSX.Element {
  const color = props.color || Tailwind_semantic().icon.neutral;
  return (
    <svg width="20" height="24" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10.7159 22.1765H10.3422C8.69105 22.1765 7.35254 20.838 7.35254 19.1869C7.35254 19.0837 7.43621 19 7.53939 19H13.5187C13.6219 19 13.7055 19.0837 13.7055 19.1869C13.7055 20.838 12.367 22.1765 10.7159 22.1765Z"
        stroke={color}
        stroke-width="2"
      />
      <path
        d="M13.2776 3.79296C15.5798 5.02218 17.1537 7.50596 17.1537 10.3699V14.802L18.6389 16.5413C19.4546 17.4965 18.7988 19 17.5664 19H2.43353C1.20125 19 0.54541 17.4965 1.36106 16.5413L2.84627 14.802V10.3699C2.84627 7.50596 4.42021 5.02218 6.72236 3.79296C7.01989 2.2017 8.37423 1 10 1C11.6258 1 12.9801 2.2017 13.2776 3.79296Z"
        stroke={color}
        stroke-width="2"
        stroke-linejoin="round"
      />
    </svg>
  );
}
