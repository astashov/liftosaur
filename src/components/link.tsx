import { h, JSX } from "preact";

type IProps = JSX.HTMLAttributes<HTMLAnchorElement>;

export function Link(props: IProps): JSX.Element {
  const { className, children, ...otherProps } = props;
  return (
    <a target="_blank" className={`text-bluev2 font-bold underline ${className}`} {...otherProps}>
      {children}
    </a>
  );
}
