import { h, JSX, Fragment } from "preact";
import { useState } from "preact/hooks";
import { IconHamburger } from "./icons/iconHamburger";
import { MenuItemWrapper } from "./menuItem";
import { BottomSheet } from "./bottomSheet";

export function TopNavMenu(props: { maxWidth?: number; current?: string }): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav class="w-full mx-auto px-2 my-6" style={{ maxWidth: props.maxWidth ? `${props.maxWidth}px` : "800px" }}>
      <div class="flex items-center cursor-pointer">
        <div className="mr-2 sm:hidden">
          <button className="p-2" onClick={() => setIsMenuOpen(true)}>
            <IconHamburger />
          </button>
        </div>
        {isMenuOpen && (
          <BottomSheet isHidden={!isMenuOpen} onClose={() => setIsMenuOpen(false)}>
            <div className="p-4">
              {getMenuItemsList().map(([text, link]) => {
                return (
                  <MenuItemWrapper name={text}>
                    {props.current === link ? (
                      <span className="inline-block py-4 font-bold">{text}</span>
                    ) : (
                      <a className="inline-block py-4" href={link}>
                        {text}
                      </a>
                    )}
                  </MenuItemWrapper>
                );
              })}
              <ul className="mt-4 text-center align-middle list-none">
                <SocialIcons />
              </ul>
            </div>
          </BottomSheet>
        )}
        <div className="flex-1">
          <a href="/" class="text-gray-900 no-underline">
            <img
              className="inline align-middle"
              style={{ width: "2.5em", height: "2.5em" }}
              src="/images/logo.svg"
              alt="Liftosaur Logo"
            />
            <span
              className="inline text-3xl font-bold text-gray-900 align-middle"
              style={{ marginLeft: "8px", fontFamily: "Poppins" }}
            >
              Liftosaur
            </span>
          </a>
        </div>
        <div className="items-center justify-center hidden ml-auto sm:block">
          <ul className="font-bold text-right align-middle list-none">
            {getMenuItemsList().map(([text, link]) => {
              return (
                <li className="inline-block mx-3 leading-5 align-middle list-none">
                  {props.current === link ? (
                    <strong>{text}</strong>
                  ) : (
                    <a className="text-blue-700 underline cursor-pointer" href={link}>
                      {text}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <ul className="hidden text-right align-middle list-none sm:block" style={{ marginTop: "-0.5rem" }}>
        <SocialIcons />
      </ul>
    </nav>
  );
}

function getMenuItemsList(): [string, string][] {
  return [
    ["About", "/about"],
    ["Docs", "/docs/docs.html"],
    ["Blog", "/blog"],
    ["Web Editor", "/program"],
    ["Workout Planner", "/planner"],
  ];
}

function SocialIcons(): JSX.Element {
  return (
    <>
      {[
        ["Instagram", "https://www.instagram.com/liftosaurapp", "logo-instagram"],
        ["Twitter", "https://www.twitter.com/liftosaur", "logo-twitter"],
        ["Reddit", "https://www.reddit.com/r/liftosaur", "logo-reddit"],
        ["Discord", "https://discord.gg/AAh3cvdBRs", "logo-discord"],
      ].map(([text, link, img]) => {
        return (
          <li className="inline-block align-middle list-none">
            <a
              target="_blank"
              href={link}
              style={{
                textIndent: "9999px",
                backgroundPosition: "50%",
                backgroundSize: "60%",
                backgroundImage: `url(/images/${img}.svg)`,
              }}
              className="inline-block w-8 h-8 p-2 bg-no-repeat"
            >
              <span>{text}</span>
            </a>
          </li>
        );
      })}
    </>
  );
}
