import { useEffect, useState } from "preact/hooks";
import { Platform } from "../utils/platform";
import { JSX, h } from "preact";

export function Onelink(props: JSX.HTMLAttributes<HTMLAnchorElement>): JSX.Element {
  const initialOnelink = Platform.onelink(true);
  console.log("Initial onelink:", initialOnelink);
  const [onelink, setOnelink] = useState(initialOnelink);
  console.log("Onelink state:", onelink);
  useEffect(() => {
    setOnelink(Platform.onelink(false));
  }, []);

  return <a href={onelink} {...props} />;
}
