import { h, JSX, ComponentChildren } from "preact";

interface IProps {
  href: string;
  className?: string;
  children: ComponentChildren;
}

export function InternalLink(props: IProps): JSX.Element {
  return (
    <a
      href={props.href}
      target="_blank"
      className={props.className}
      onClick={(e) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window.navigator as any).standalone) {
          e.preventDefault();
          window.open(`https://liftosaur.netlify.app${props.href}`, "_blank");
        }
      }}
    >
      {props.children}
    </a>
  );
}
