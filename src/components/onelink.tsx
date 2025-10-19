import { useEffect, useState } from "preact/hooks";
import { Platform } from "../utils/platform";
import { JSX, h } from "preact";

export function Onelink(props: JSX.HTMLAttributes<HTMLAnchorElement>): JSX.Element {
  const initialOnelink = Platform.onelink(true);
  const [onelink, setOnelink] = useState(initialOnelink);
  useEffect(() => {
    setOnelink(Platform.onelink(false));
  }, []);

  return <a href={onelink} {...props} />;
}
