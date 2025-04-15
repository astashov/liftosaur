import { h, JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import QRCode from "qrcode";

interface IProgramQrCodeProps {
  url: string;
  size?: string;
  title?: string;
}

export function ProgramQrCode(props: IProgramQrCodeProps): JSX.Element {
  useEffect(() => {
    QRCode.toCanvas(ref.current, props.url, function (error) {
      if (error) {
        console.error(error);
      }
      ref.current.style.width = size;
      ref.current.style.height = size;
    });
  }, [props.url]);
  const ref = useRef<HTMLCanvasElement>(null);
  const size = props.size ?? "10rem";

  return (
    <div className="mt-1">
      {props.title && <div className="text-xs text-grayv2-main">{props.title}</div>}
      <canvas ref={ref} className="inline-block" style={{ width: size, height: size }} />
    </div>
  );
}
