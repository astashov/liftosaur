import { h, JSX } from "preact";

interface IButtonIconProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  name: string;
}

export function ButtonIcon(props: IButtonIconProps): JSX.Element {
  const { name, children, className, ...rest } = props;
  return (
    <button
      className={`${className || ""} cursor-pointer min-h-8 leading-6 w-8 h-8 flex items-center justify-center bg-purplev3-50 border-purplev3-200 border rounded-lg nm-${name}`}
      {...rest}
    >
      {children}
    </button>
  );
}
