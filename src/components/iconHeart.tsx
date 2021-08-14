import { h, JSX } from "preact";

interface IProps {
  size?: number;
  fillColor?: string;
  strokeColor?: string;
}

export function IconHeart(props: IProps): JSX.Element {
  return (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 13 10" className="inline-block">
      <g stroke="none" stroke-width="0.5" fill="none" fill-rule="evenodd">
        <g
          transform="translate(-5.500000, -8.000000)"
          fill={props.fillColor || undefined}
          stroke={props.strokeColor || undefined}
        >
          <path d="M12.8786797,8.87867966 C14.0502525,7.70710678 15.9497475,7.70710678 17.1213203,8.87867966 C18.2928932,10.0502525 18.2928932,11.9497475 17.1213203,13.1213203 L12.7071068,17.5355339 C12.3165825,17.9260582 11.6834175,17.9260582 11.2928932,17.5355339 L6.87867966,13.1213203 C5.70710678,11.9497475 5.70710678,10.0502525 6.87867966,8.87867966 C8.05025253,7.70710678 9.94974747,7.70710678 11.1213203,8.87867966 L12,9.75735931 L12.8786797,8.87867966 Z"></path>
        </g>
      </g>
    </svg>
  );
}
