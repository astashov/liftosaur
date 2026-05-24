import { JSX, ReactNode, UIEvent } from "react";

interface IScrollEventLike {
  nativeEvent: {
    contentOffset: { y: number };
    contentSize: { height: number };
    layoutMeasurement: { height: number };
  };
}

interface IProps {
  children: ReactNode;
  header?: ReactNode | string;
  noPadding?: boolean;
  scrollEnabled?: boolean;
  onScroll?: (e: IScrollEventLike) => void;
}

export function FormSheet(props: IProps): JSX.Element {
  const hasHeader = props.header != null;
  const scrollPadding = props.noPadding ? "" : ["px-4", hasHeader ? "" : "pt-6", "pb-6"].filter(Boolean).join(" ");
  const headerNode =
    typeof props.header === "string" ? (
      <div className="flex items-center justify-center py-4">
        <span className="text-base font-semibold">{props.header}</span>
      </div>
    ) : (
      props.header
    );
  const onScroll = props.onScroll;
  const handleScroll = onScroll
    ? (e: UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        onScroll({
          nativeEvent: {
            contentOffset: { y: el.scrollTop },
            contentSize: { height: el.scrollHeight },
            layoutMeasurement: { height: el.clientHeight },
          },
        });
      }
    : undefined;
  return (
    <div className="flex flex-col" style={{ maxHeight: "85vh" }}>
      {hasHeader && <div className="shrink-0">{headerNode}</div>}
      <div className={`overflow-y-auto min-h-0 ${scrollPadding}`} style={{ flex: "0 1 auto" }} onScroll={handleScroll}>
        {props.children}
      </div>
    </div>
  );
}
