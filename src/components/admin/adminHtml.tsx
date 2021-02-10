import { h, JSX, ComponentChildren } from "preact";
import render from "preact-render-to-string";

interface IProps {
  apiKey: string;
  props: unknown;
  children: ComponentChildren;
}

export function renderAdminHtml(el: JSX.Element): string {
  return "<!DOCTYPE html>" + render(el);
}

export function AdminHtml(props: IProps): JSX.Element {
  return (
    <html lang="en">
      <head>
        <title>Liftosaur: Weight Lifting Tracking App | Admin</title>
        <link rel="stylesheet" type="text/css" href="/admin.css?version=xxxxxxxx" />
        <meta charSet="UTF-8" />
        <link rel="preconnect" href="https://api.liftosaur.com" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="shortcut icon" type="image/x-icon" href="/icons/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon512.png" />
        <meta name="theme-color" content="#ffffff" />
        <meta
          name="description"
          content="A weight lifting tracking app, that allows you to follow popular weight lifting routines"
        />
      </head>
      <body>
        <div class="content">
          <nav class="top-nav">
            <div class="top-nav-left">
              <a href="/" class="top-nav-logo">
                <img src="/images/logo.svg" alt="Liftosaur Logo" />
                <span>Liftosaur</span>
              </a>
            </div>
            <div class="top-nav-right">
              <ul class="top-nav-menu">
                <li>
                  <a href={`/admin/logs?key=${props.apiKey}`}>Logs</a>
                </li>
                <li>
                  <a href={`/admin/users?key=${props.apiKey}`}>Users</a>
                </li>
              </ul>
            </div>
          </nav>
          <div id="app" style={{ padding: "0 2em", margin: "0 auto", width: "100%" }}>
            {props.children}
          </div>
        </div>
        <div id="data" style={{ display: "none" }}>
          {JSON.stringify(props.props)}
        </div>
        <script src="/admin.js?version=xxxxxxxx"></script>
      </body>
    </html>
  );
}
