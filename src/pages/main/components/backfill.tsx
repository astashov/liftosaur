import { h, JSX } from "preact";

export function Backfill(): JSX.Element {
  return (
    <div>
      <div
        className="absolute inset-0 bg-repeat-x"
        style={{
          backgroundImage: "url(/images/backgroundfill.jpg)",
          backgroundSize: "30px 260px",
        }}
      />
      {/* <div
        className="absolute top-0 right-0 w-full bg-no-repeat"
        style={{
          backgroundImage: "url(/images/backgroundhero.jpg)",
          backgroundSize: "2426px 771px",
          backgroundPosition: "calc(50% + 215px) top",
          height: "771px",
        }}
      /> */}
    </div>
  );
}
