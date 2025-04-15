import { h, JSX, Fragment } from "preact";
import { useState } from "preact/hooks";
import { IconHamburger } from "./icons/iconHamburger";
import { Account } from "./account";
import { MenuItemWrapper } from "./menuItem";
import { BottomSheet } from "./bottomSheet";
import { IconUser } from "./icons/iconUser";
import { IAccount } from "../models/account";
import { Modal } from "./modal";
import { Service } from "../api/service";

export function TopNavMenu(props: {
  client: Window["fetch"];
  mobileRight?: JSX.Element;
  maxWidth: number;
  current?: string;
  account?: IAccount;
}): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const service = new Service(props.client);

  return (
    <nav class="w-full mx-auto px-2 my-10" style={{ maxWidth: `${props.maxWidth}px` }}>
      <div class="flex items-center">
        <div className="flex items-center w-full mr-2 md:hidden">
          <div>
            <button className="p-2 align-middle nm-navbar-hamburger" onClick={() => setIsMenuOpen(true)}>
              <IconHamburger />
            </button>
          </div>
          <div>
            <a href="/" class="text-gray-900 align-middle no-underline ml-3">
              <img
                className="inline align-middle"
                style={{ width: "3.5em", height: "3.5em" }}
                src="/images/logo.svg"
                alt="Liftosaur Logo"
              />
            </a>
          </div>
          <div className="flex-1 ml-4 text-2xl font-bold align-middle sm:text-3xl">Liftosaur</div>
          {props.mobileRight && <div className="ml-auto">{props.mobileRight}</div>}
        </div>
        {isMenuOpen && (
          <BottomSheet isHidden={!isMenuOpen} onClose={() => setIsMenuOpen(false)}>
            <div className="p-4">
              <MenuItemWrapper
                name="Account"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsAccountModalOpen(true);
                }}
              >
                <span className={`inline-block py-4 ${props.account ? "text-greenv2-main" : "text-redv2-main"}`}>
                  Account
                </span>
              </MenuItemWrapper>
              {getMenuItemsList(!!props.account).map(([text, link]) => {
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
        <div className="items-center flex-1 hidden md:flex">
          <div>
            <a href="/" class="text-gray-900 no-underline">
              <img
                className="inline align-middle"
                style={{ width: "5em", height: "5em" }}
                src="/images/logo.svg"
                alt="Liftosaur Logo"
              />
            </a>
          </div>
          <div className="flex flex-wrap items-center flex-1">
            <ul className="flex-1 ml-2 font-bold align-middle list-none whitespace-nowrap">
              {getMenuItemsList(!!props.account).map(([text, link]) => {
                return (
                  <li className="inline-block mx-4 align-middle list-none">
                    {props.current === link ? (
                      <strong className="text-orangev2">{text}</strong>
                    ) : (
                      <a className="cursor-pointer" href={link}>
                        {text}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-center ml-4">
              <ul className="flex list-none">
                <SocialIcons />
              </ul>
              <div className="mx-3 bg-grayv2-main" style={{ width: "1px", height: "2rem" }} />
              <div className="inline-block leading-5 align-middle list-none">
                <button onClick={() => setIsAccountModalOpen(true)} className="p-3">
                  <IconUser size={22} color={props.account ? "#38A169" : "#E53E3E"} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {isAccountModalOpen && (
        <ModalAccount account={props.account} service={service} onClose={() => setIsAccountModalOpen(false)} />
      )}
    </nav>
  );
}

function getMenuItemsList(isLoggedIn: boolean): readonly (readonly [string, string])[] {
  return [
    ["About", "/about"],
    ["Docs", "/docs"],
    ["Blog", "/blog"],
    ["Exercises", "/exercises"],
    ["Web Editor", "/planner"],
    ...(isLoggedIn ? [["Your Programs", "/user/programs"] as const] : []),
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
          <li className="inline-block list-none md:block">
            <a
              target="_blank"
              href={link}
              style={{
                textIndent: "9999px",
                backgroundPosition: "50%",
                backgroundSize: "60%",
                backgroundImage: `url(/images/${img}.svg)`,
              }}
              className="inline-block w-10 h-10 px-2 mx-1 overflow-hidden align-middle bg-no-repeat"
            >
              <span>{text}</span>
            </a>
          </li>
        );
      })}
    </>
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
