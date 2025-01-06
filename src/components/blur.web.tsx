export function Blur(props: { blur: number; children: React.ReactNode }): JSX.Element {
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center"
      style={{ backdropFilter: `blur(${props.blur}px)`, WebkitBackdropFilter: `blur(${props.blur}px)` }}
    >
      {props.children}
    </div>
  );
}
