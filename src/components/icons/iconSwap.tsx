import { h, JSX } from "preact";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  className?: string;
}

export function IconSwap(props: IProps): JSX.Element {
  const size = props.size ?? 20;
  const color = props.color ?? Tailwind_semantic().icon.neutral;
  return (
    <svg
      className={props.className}
      width={size}
      height={size}
      viewBox="0 0 61 61"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M58.1574 22.1348C57.5571 20.6512 55.7714 19.8993 54.1693 20.4551C52.5663 21.011 51.7552 22.6646 52.3555 24.1481C59.2796 41.2586 41.8841 58.2121 23.1916 52.9027L23.5299 52.2149C24.5126 50.2145 22.7941 47.9577 20.4102 48.1715L12.2173 48.9076C9.84535 49.1205 8.6117 51.6386 9.99591 53.4307L14.7799 59.6324C16.1662 61.4292 19.1353 61.1587 20.1211 59.1528L20.6079 58.1619C44.4367 65.5906 66.9846 43.9496 58.1574 22.1348Z"
        fill={color}
      />
      <path
        d="M37.0226 8.79372L36.6846 9.48426C35.6988 11.5017 37.4338 13.7572 39.8016 13.5435L47.9862 12.8044C50.346 12.5917 51.5956 10.0721 50.2066 8.26369L45.4258 2.03673C44.0418 0.233869 41.0743 0.504485 40.0894 2.51824L39.602 3.51485C16.1746 -3.82537 -6.86073 17.459 2.08804 39.6812C2.68776 41.1706 4.4719 41.9264 6.07251 41.3684C7.67312 40.8104 8.48445 39.1503 7.88473 37.66C0.889587 20.2893 18.5625 3.52512 37.0226 8.79372Z"
        fill={color}
      />
    </svg>
  );
}
