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

export function IconHome(props: IProps): JSX.Element {
  const { isSelected, ...rest } = props;
  return isSelected ? <IconHomeSelected {...rest} /> : <IconHomeUnselected {...rest} />;
}

export function IconHomeUnselected(props: IInnerProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind.colors().blackv2;
  return (
    <svg
      width={size}
      height={size}
      className={props.className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 19V12.1528C7 11.5226 7.53726 11.0116 8.2 11.0116H11.8C12.4627 11.0116 13 11.5226 13 12.1528V19M9.30457 1.21117L1.50457 6.48603C1.18802 6.7001 1 7.04665 1 7.41605V17.2882C1 18.2336 1.80589 19 2.8 19H17.2C18.1941 19 19 18.2336 19 17.2882V7.41605C19 7.04665 18.812 6.70011 18.4954 6.48603L10.6954 1.21117C10.2791 0.92961 9.72092 0.929609 9.30457 1.21117Z"
        stroke={color}
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
  );
}

export function IconHomeSelected(props: IInnerProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind.colors().purplev3.main;
  return (
    <svg
      width={size}
      height={size}
      className={props.className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M19 17.2882V7.41605C19 7.04665 18.812 6.70011 18.4954 6.48603L10.6954 1.21117C10.2791 0.92961 9.72092 0.929609 9.30457 1.21117L1.50457 6.48603C1.18802 6.7001 1 7.04665 1 7.41605V17.2882C1 18.2336 1.80589 19 2.8 19H5.999V13.0139C5.999 11.6627 6.97364 10.9798 8.04577 10.9798H12.0459C13.0057 10.9798 14.0968 11.5129 14.0968 13.1144V19H17.2C18.1941 19 19 18.2336 19 17.2882Z"
        fill={color}
        stroke={color}
        stroke-width="1.5"
      />
    </svg>
  );
}
