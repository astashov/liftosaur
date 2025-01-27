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

export function IconMe(props: IProps): JSX.Element {
  const { isSelected, ...rest } = props;
  return isSelected ? <IconMeSelected {...rest} /> : <IconMeUnselected {...rest} />;
}

function IconMeUnselected(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind.colors().blackv2;
  return (
    <svg
      width={size}
      stroke={color}
      height={size}
      className={props.className}
      viewBox="0 0 23 23"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M13.6154 15.9506L12.1148 14.684" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path
        d="M4.96121 10.5659C0.838258 15.7236 2.06397 19.5278 2.06397 19.5278C4.40407 21.2471 8.50406 21.62 11.2106 21.62H16.8184C19.1873 21.5397 21.1064 19.9424 21.1064 16.9673C21.1064 13.6142 18.7045 12.6144 16.5694 12.5375C14.9666 12.5373 13.4865 13.383 12.6913 14.7534L12.5288 15.0332L12.1149 14.6839C10.8944 13.6537 9.09328 13.6537 7.87275 14.6839L7.45884 15.0332L9.01152 11.913"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M8.32785 11.6487C11.2072 11.6487 13.5414 9.34999 13.5414 6.51436C13.5414 3.67874 11.2072 1.38 8.32785 1.38C5.44848 1.38 3.11429 3.67874 3.11429 6.51436C3.11429 9.34999 5.44848 11.6487 8.32785 11.6487Z"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M8.98961 6.51434C8.98961 6.85719 8.7042 7.15465 8.32785 7.15465C7.95151 7.15465 7.66609 6.85719 7.66609 6.51434C7.66609 6.17148 7.95151 5.87402 8.32785 5.87402C8.7042 5.87402 8.98961 6.17148 8.98961 6.51434Z"
        stroke-width="1.5"
      />
    </svg>
  );
}

function IconMeSelected(props: IInnerProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind.colors().purplev3.main;
  return (
    <svg
      width={size}
      fill={color}
      height={size}
      className={props.className}
      viewBox="0 0 23 23"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8.30005 0.5C5.26253 0.5 2.80005 2.96242 2.80005 5.99995C2.80005 9.03748 5.26253 11.5 8.30005 11.5C11.3376 11.5 13.8 9.03758 13.8 5.99995C13.8 2.96231 11.3376 0.5 8.30005 0.5ZM8.30005 7.4415C7.46566 7.4415 6.83301 6.77183 6.83301 6.00005C6.83301 5.22827 7.46577 4.5586 8.30005 4.5586C9.13433 4.5586 9.76719 5.22817 9.76719 6.00005C9.76719 6.77194 9.13443 7.4415 8.30005 7.4415Z" />
      <path d="M16.6388 11.1214H16.6378C15.1977 11.1214 13.8392 11.723 12.8559 12.7388C12.8725 12.7526 12.8911 12.7627 12.9074 12.7768L13.3273 13.139C13.3278 13.1394 13.328 13.1402 13.3286 13.1406L14.4285 14.0908C14.7503 14.3684 14.7899 14.8592 14.5195 15.1874C14.369 15.3698 14.1541 15.4635 13.9383 15.4635C13.765 15.4635 13.5907 15.4032 13.4481 15.2801L11.9271 13.9661C11.3324 13.4538 10.5392 13.2563 9.79198 13.3959C9.77829 13.3989 9.76389 13.403 9.7499 13.4064C9.56819 13.4436 9.39438 13.5178 9.2222 13.5958C8.56928 13.8962 7.08578 14.5966 7.08578 14.5966L7.40245 12.5828C7.36189 12.5774 7.32154 12.5713 7.28118 12.5652C5.77435 12.3447 4.42115 11.6395 3.39172 10.6C0.0801574 15.588 1.15552 19.2258 1.20683 19.3899C1.25631 19.5454 1.35143 19.6816 1.48011 19.7784C4.16765 21.7986 8.72676 22.1 11.2053 22.1L16.9171 22.0995C19.9571 21.9935 22 19.7415 22 16.495C22 13.2531 20.0056 11.2445 16.6388 11.1214Z" />
    </svg>
  );
}
