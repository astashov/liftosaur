import { h, JSX } from "preact";
import { ImportExporter } from "../lib/importexporter";
import { IStorage } from "../types";

interface IProps {
  storage: IStorage;
}

export function AboutDisclaimer(props: IProps): JSX.Element {
  return (
    <div
      style={{
        margin: "1rem auto",
        maxWidth: "800px",
        color: "#171718",
      }}
    >
      <div
        style={{
          margin: "0 1rem",
          padding: "1rem",
          background: "rgba(255,255,240)",
          border: "1px solid rgba(246,173,85)",
          borderRadius: "0.5rem",
        }}
      >
        <p style={{ marginBottom: "1rem" }}>
          The web app was moved to{" "}
          <a
            href="https://www.liftosaur.com/app/"
            target="_blank"
            style={{
              fontWeight: "bold",
              color: "#28839F",
              textDecoration: "underline",
            }}
          >
            https://www.liftosaur.com/app/
          </a>
          . If you used an app installed from <strong>App Store</strong> or <strong>Google Play</strong>, you need to
          update to the new version of the app. If you used it as a web app, as a <strong>PWA</strong> - you need to add{" "}
          <strong>https://www.liftosaur.com/app/</strong> to your home screen now.
        </p>
        <p style={{ marginBottom: "1rem" }}>
          Just in case, make sure to download your data from the old app before you update it. You can import it into
          the app (by going to <strong>Settings - Import data from file</strong>) to restore all your history, programs
          and settings if anything goes wrong.
        </p>
        <div style={{ textAlign: "center", margin: "0.5rem 0" }}>
          <a
            href="#"
            target="_blank"
            style={{
              fontWeight: "bold",
              color: "#28839F",
              textDecoration: "underline",
            }}
            onClick={(e) => {
              e.preventDefault();
              ImportExporter.exportStorage(props.storage);
            }}
          >
            Click here to download your data!
          </a>
        </div>
      </div>
    </div>
  );
}
