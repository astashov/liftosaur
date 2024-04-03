import { JSX, h } from "preact";
import { IAccount } from "../models/account";

interface IProps {
  maxWidth?: number;
  account?: IAccount;
}

export function FooterPage(props: IProps): JSX.Element {
  const maxWidth = props.maxWidth != null ? `${props.maxWidth}px` : "800px";
  return (
    <footer>
      <div
        className="w-full bg-no-repeat"
        style={{
          paddingBottom: "9%",
          backgroundSize: "100% auto",
          backgroundImage: "url(/images/desktop-wave-footer.svg)",
        }}
      ></div>
      <div style={{ backgroundColor: "#fafafa" }}>
        <div className="flex flex-col px-6 py-0 mx-auto my-0 text-sm font-bold md:flex-row" style={{ maxWidth }}>
          <nav className="flex items-center flex-1 w-full px-0 py-6 leading-loose text-left md:text-right md:py-12 md:px-3">
            <div className="flex flex-1 md:pr-6">
              <ul className="flex-1">
                {[
                  ["About", "/about"],
                  ["Docs", "/docs/docs.html"],
                  ["Legacy Web Editor", "/program"],
                  ["Web Editor", "/planner"],
                  ...(!!props.account ? [["Your Programs", "/user/programs"]] : []),
                ].map(([text, link]) => {
                  return (
                    <li className="block mx-4 my-0 mb-2 leading-5 text-left">
                      <a className="text-blue-700 underline cursor-pointer" href={link}>
                        {text}
                      </a>
                    </li>
                  );
                })}
              </ul>
              <ul className="flex-1">
                {[
                  ["Blog", "/blog"],
                  ["Terms & Conditions", "/terms.html"],
                  ["Privacy", "/privacy.html"],
                  ["Affiliate Program", "/affiliates"],
                ].map(([text, link]) => {
                  return (
                    <li className="block mx-4 my-0 mb-2 leading-5 text-left">
                      <a className="text-blue-700 underline cursor-pointer" href={link}>
                        {text}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
            <ul className="inline-block align-middle list-none">
              {[
                ["Instagram", "https://www.instagram.com/liftosaurapp", "logo-instagram"],
                ["Twitter", "https://www.twitter.com/liftosaur", "logo-twitter"],
                ["Reddit", "https://www.reddit.com/r/liftosaur", "logo-reddit"],
                ["Discord", "https://discord.gg/AAh3cvdBRs", "logo-discord"],
              ].map(([text, link, img]) => {
                return (
                  <li className="inline-block text-left align-middle list-none">
                    <a
                      target="_blank"
                      href={link}
                      style={{
                        textIndent: "-9999px",
                        backgroundPosition: "50%",
                        backgroundSize: "60%",
                        backgroundImage: `url(/images/${img}.svg)`,
                      }}
                      className="inline-block w-10 h-10 p-2 bg-no-repeat"
                    >
                      <span>{text}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
