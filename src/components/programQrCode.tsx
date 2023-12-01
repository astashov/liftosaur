import { h, JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import QRCode from "qrcode";

interface IProgramQrCodeProps {
  url: string;
}

export function ProgramQrCode(props: IProgramQrCodeProps): JSX.Element {
  useEffect(() => {
    QRCode.toCanvas(ref.current, props.url, function (error) {
      if (error) {
        console.error(error);
      }
    });
  }, [props.url]);
  const ref = useRef<HTMLCanvasElement>(null);

  return (
    <div className="mt-1">
      <div className="text-xs text-grayv2-main">Scan this QR to open that link:</div>
      <canvas ref={ref} className="inline-block w-40 h-40" />
    </div>
  );
}
