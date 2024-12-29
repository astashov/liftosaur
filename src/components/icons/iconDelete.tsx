import React, { JSX } from "react";

export function IconDelete(): JSX.Element {
  return (
    <div className="flex items-center justify-center w-5 h-5 bg-red-600 rounded-full">
      <div className="w-3 bg-white" style={{ height: "2px" }} />
    </div>
  );
}
