import React, { JSX, useEffect, useState } from "react";
import { Platform_onelink } from "../utils/platform";

interface IOnelinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  type?: "ios" | "android";
}

export function Onelink(props: IOnelinkProps): JSX.Element {
  const { type, ...rest } = props;
  const initialOnelink = Platform_onelink(true);
  const [onelink, setOnelink] = useState(initialOnelink);
  useEffect(() => {
    setOnelink(Platform_onelink(false, type));
  }, []);

  return <a href={onelink} {...rest} />;
}
