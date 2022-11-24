import { h, JSX } from "preact";

export function IconCheckCircle(props: { isChecked: boolean }): JSX.Element {
  if (props.isChecked) {
    return (
      <svg width="18" height="19" viewBox="0 0 18 19" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M9 0.5C4.02975 0.5 0 4.52975 0 9.5C0 14.4703 4.02975 18.5 9 18.5C13.9703 18.5 18 14.4703 18 9.5C18 4.52975 13.9703 0.5 9 0.5ZM8.0625 13.469L4.6875 10.196L6.08025 8.8025L8.0625 10.682L12.2948 6.344L13.6875 7.73675L8.0625 13.469Z"
          fill="#28839F"
        />
      </svg>
    );
  } else {
    return (
      <div
        style={{ width: "18px", height: "18px", borderWidth: "2px" }}
        className="border rounded-full border-bluev2"
      />
    );
  }
}
