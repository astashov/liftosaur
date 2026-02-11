import { useEffect, useState } from "preact/hooks";
import { Platform } from "../utils/platform";
import { JSX, h } from "preact";

interface IOnelinkProps extends JSX.HTMLAttributes<HTMLAnchorElement> {
  type?: "ios" | "android";
}

export function Onelink(props: IOnelinkProps): JSX.Element {
  const { type, ...rest } = props;
  const initialOnelink = Platform.onelink(true);
  const [onelink, setOnelink] = useState(initialOnelink);
  useEffect(() => {
    setOnelink(Platform.onelink(false, type));
  }, []);

  return <a href={onelink} {...rest} />;
}
