import { h, JSX } from "preact";
import { useState } from "preact/hooks";
import { IconHamburger } from "./icons/iconHamburger";
import { Account } from "./account";
import { IconUser } from "./icons/iconUser";
import { IAccount } from "../models/account";
import { Modal } from "./modal";
import { Service } from "../api/service";
import { IconReddit } from "./icons/iconReddit";
import { IconDiscord } from "./icons/iconDiscord";
import { IconClose } from "./icons/iconClose";
import { IconApple } from "./icons/iconApple";
import { Onelink } from "./onelink";
import { IconInstagramFlat } from "./icons/iconInstagramFlat";
import { Tailwind } from "../utils/tailwindConfig";
import { IconYoutube } from "./icons/iconYoutube";
import { IconGooglePlay } from "./icons/iconGooglePlay";

export function TopNavMenu(props: {
  client: Window["fetch"];
  maxWidth: number;
  current?: string;
  account?: IAccount;
  mobileRight?: JSX.Element;
  isWhite?: boolean;
}): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const service = new Service(props.client);
  const isLoggedIn = !!props.account;

  return (
    <nav className="w-full mx-auto">
      <div className="flex items-center">
        {/* Mobile nav */}
        <div className="flex items-center w-full gap-2 px-4 py-4 md:hidden">
          <div className="flex items-center gap-2 mr-auto">
            <div className="overflow-hidden rounded-lg" style={{ width: "2.5rem", height: "2.5rem" }}>
              <a href="/" className="flex items-center no-underline">
                <img
                  className="inline align-middle"
                  style={{ width: "2.5rem", height: "2.5rem" }}
                  src="/images/icon.svg"
                  alt="Liftosaur Logo"
                />
              </a>
            </div>
            <div className={`text-xl font-bold ${props.isWhite ? "text-white" : ""}`}>Liftosaur</div>
          </div>
          {props.mobileRight}
          <div>
            <button
              className="p-2 align-middle bg-white rounded-lg nm-navbar-hamburger"
              onClick={() => setIsMenuOpen(true)}
            >
              <IconHamburger />
            </button>
          </div>
        </div>

        {/* Mobile full-screen overlay menu */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-white md:hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="overflow-hidden rounded-lg" style={{ width: "2.5rem", height: "2.5rem" }}>
                    <a href="/" className="flex items-center no-underline">
                      <img
                        className="inline align-middle"
                        style={{ width: "2.5rem", height: "2.5rem" }}
                        src="/images/icon.svg"
                        alt="Liftosaur Logo"
                      />
                    </a>
                  </div>
                  <div className="text-xl font-bold">Liftosaur</div>
                </div>
                <button className="p-2" onClick={() => setIsMenuOpen(false)}>
                  <IconClose size={20} color="#000" />
                </button>
              </div>
              <div className="flex flex-col gap-4 mb-6">
                {getMenuItems(isLoggedIn).map(([text, link]) => (
                  <a className="font-semibold no-underline" href={link} onClick={() => setIsMenuOpen(false)}>
                    {text}
                  </a>
                ))}
              </div>
              <div className="pt-6 mb-6 border-t border-gray-200">
                {isLoggedIn ? (
                  <button
                    className="font-semibold text-purple-600"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsAccountModalOpen(true);
                    }}
                  >
                    Sign Out
                  </button>
                ) : (
                  <button
                    className="font-semibold text-purple-600"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsAccountModalOpen(true);
                    }}
                  >
                    Sign In
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-3 mb-8">
                <Onelink className="flex items-center gap-3 text-black no-underline">
                  <IconApple color={Tailwind.semantic().text.primary} />
                  <span className="text-base">App Store</span>
                </Onelink>
                <a
                  href="https://play.google.com/store/apps/details?id=com.liftosaur.www.twa"
                  target="_blank"
                  className="flex items-center gap-3 text-black no-underline"
                >
                  <IconGooglePlay size={20} color={Tailwind.semantic().text.primary} />
                  <span className="text-base">Google Play</span>
                </a>
              </div>
              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center gap-5">
                  <a href="https://www.instagram.com/liftosaurapp" target="_blank">
                    <IconInstagramFlat size={24} color={Tailwind.semantic().text.primary} />
                  </a>
                  <a href="https://x.com/liftosaur" target="_blank">
                    <IconYoutube size={24} color={Tailwind.semantic().text.primary} />
                  </a>
                  <a href="https://www.reddit.com/r/liftosaur" target="_blank">
                    <IconReddit size={24} color={Tailwind.semantic().text.primary} />
                  </a>
                  <a href="https://discord.gg/AAh3cvdBRs" target="_blank">
                    <IconDiscord size={24} color={Tailwind.semantic().text.primary} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        <DesktopNav
          maxWidth={props.maxWidth}
          current={props.current}
          onAccountClick={() => setIsAccountModalOpen(true)}
          isLoggedIn={isLoggedIn}
          isWhite={props.isWhite}
        />
      </div>
      {isAccountModalOpen && (
        <ModalAccount account={props.account} service={service} onClose={() => setIsAccountModalOpen(false)} />
      )}
    </nav>
  );
}

function getMenuItems(isLoggedIn: boolean): readonly (readonly [string, string, string?])[] {
  return [
    ["Programs", "/#programs"],
    ["Exercises", "/exercises"],
    ["Web Editor", "/planner"],
    ["Docs", "/docs"],
    ["Blog", "/blog"],
    ["AI Helper", "/ai/prompt"],
    ...(isLoggedIn ? [["My Programs", "/user/programs"] as const] : []),
  ];
}

interface IDesktopNavProps {
  current?: string;
  onAccountClick: () => void;
  isLoggedIn: boolean;
  isWhite?: boolean;
  maxWidth: number;
}

function DesktopNav(props: IDesktopNavProps): JSX.Element {
  return (
    <div className={`mb-4 w-full hidden md:block ${props.isWhite ? "" : "border-b border-background-neutral"}`}>
      <div
        className={`mx-auto px-4 py-4 items-center gap-4 flex-1 hidden text-black md:flex ${props.isWhite ? "text-white" : ""}`}
        style={{ maxWidth: `${props.maxWidth}px` }}
      >
        <a href="/" className="flex items-center gap-4 mr-auto no-underline shrink-0">
          <div className="overflow-hidden rounded-lg" style={{ width: "3em", height: "3em" }}>
            <img
              className="inline align-middle"
              style={{ width: "100%", height: "100%" }}
              src="/images/icon.svg"
              alt="Liftosaur Logo"
            />
          </div>
          <span className="text-xl font-bold">Liftosaur</span>
        </a>
        <div className="flex items-center gap-4">
          <ul className="flex flex-wrap items-center justify-end leading-none list-none gap-x-4">
            {getMenuItems(props.isLoggedIn).map(([text, link, hideClass]) => (
              <li className={`list-none ${hideClass || ""}`}>
                {props.current === link && link !== "/#programs" ? (
                  <span className={`py-1 text-sm underline ${props.isWhite ? "text-white" : "text-purple-700"}`}>
                    {text}
                  </span>
                ) : (
                  <a
                    className={`py-1 text-sm font-medium ${props.isWhite ? "text-white" : "text-gray-700"} no-underline hover:underline`}
                    href={link}
                  >
                    {text}
                  </a>
                )}
              </li>
            ))}
          </ul>
          <div className="bg-gray-300 " style={{ width: "1px", height: "1.5rem" }} />
          <div className="flex items-center gap-4 shrink-0">
            <a href="https://www.instagram.com/liftosaurapp" target="_blank">
              <IconInstagramFlat
                color={props.isWhite ? Tailwind.semantic().icon.white : Tailwind.semantic().text.primary}
              />
            </a>
            <a href="https://www.youtube.com/@Liftosaur" target="_blank">
              <IconYoutube
                color={props.isWhite ? Tailwind.semantic().icon.white : Tailwind.semantic().text.primary}
                secondaryColor={props.isWhite ? Tailwind.semantic().icon.purple : Tailwind.semantic().icon.white}
              />
            </a>
            <a href="https://www.reddit.com/r/liftosaur" target="_blank">
              <IconReddit
                color={props.isWhite ? Tailwind.semantic().icon.white : Tailwind.semantic().text.primary}
                secondaryColor={props.isWhite ? Tailwind.semantic().icon.purple : Tailwind.semantic().icon.white}
              />
            </a>
            <a href="https://discord.gg/AAh3cvdBRs" target="_blank">
              <IconDiscord color={props.isWhite ? Tailwind.semantic().icon.white : Tailwind.semantic().text.primary} />
            </a>
            <div className="bg-gray-300" style={{ width: "1px", height: "1.5rem" }} />
            {props.isLoggedIn ? (
              <button onClick={() => props.onAccountClick()} className="p-1">
                <IconUser
                  size={20}
                  color={props.isWhite ? Tailwind.colors().green[400] : Tailwind.colors().green[700]}
                />
              </button>
            ) : (
              <button
                onClick={() => props.onAccountClick()}
                className={`text-sm font-medium ${props.isWhite ? "text-white" : "text-gray-700"} no-underline hover:underline whitespace-nowrap`}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface IModalAccountProps {
  account?: IAccount;
  service: Service;
  onClose: () => void;
}

function ModalAccount(props: IModalAccountProps): JSX.Element {
  return (
    <Modal onClose={props.onClose} shouldShowClose={true}>
      <Account account={props.account} client={props.service.client} />
    </Modal>
  );
}
