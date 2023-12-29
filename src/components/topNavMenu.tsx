import { h, JSX, Fragment } from "preact";
import { useEffect, useState } from "preact/hooks";
import { IconHamburger } from "./icons/iconHamburger";
import { MenuItemWrapper } from "./menuItem";
import { BottomSheet } from "./bottomSheet";
import { IconUser } from "./icons/iconUser";
import { IAccount } from "../models/account";
import { Modal } from "./modal";
import { IconGoogle } from "./icons/iconGoogle";
import { IconApple } from "./icons/iconApple";
import { getGoogleAccessToken } from "../utils/googleAccessToken";
import { Service } from "../api/service";
import { UidFactory } from "../utils/generator";
import { IconDoc } from "./icons/iconDoc";
import { IconDumbbell } from "./icons/iconDumbbell";
import { Button } from "./button";
import { IconSpinner } from "./icons/iconSpinner";

declare let __HOST__: string;

export function TopNavMenu(props: {
  maxWidth?: number;
  current?: string;
  account?: IAccount;
  client: Window["fetch"];
}): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const service = new Service(props.client);

  return (
    <nav class="w-full mx-auto px-2 my-10" style={{ maxWidth: props.maxWidth ? `${props.maxWidth}px` : "800px" }}>
      <div class="flex items-center cursor-pointer">
        <div className="mr-2 sm:hidden">
          <button className="p-2 nm-navbar-hamburger" onClick={() => setIsMenuOpen(true)}>
            <IconHamburger />
          </button>
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
          <ul className="mb-2 font-bold text-right align-middle list-none">
            {getMenuItemsList(!!props.account).map(([text, link]) => {
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
            <li className="inline-block leading-5 align-middle list-none">
              <button onClick={() => setIsAccountModalOpen(true)} className="p-2">
                <IconUser size={22} color={props.account ? "#38A169" : "#E53E3E"} />
              </button>
            </li>
          </ul>
        </div>
      </div>
      <ul className="hidden text-right align-middle list-none sm:block" style={{ marginTop: "-0.5rem" }}>
        <SocialIcons />
      </ul>
      {isAccountModalOpen && (
        <ModalAccount account={props.account} service={service} onClose={() => setIsAccountModalOpen(false)} />
      )}
    </nav>
  );
}

function getMenuItemsList(isLoggedIn: boolean): readonly (readonly [string, string])[] {
  return [
    ["About", "/about"],
    ["Docs", "/docs/docs.html"],
    ["Blog", "/blog"],
    ["Web Editor", "/program"],
    ["Workout Planner", "/planner"],
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
              className="inline-block w-8 h-8 p-2 overflow-hidden bg-no-repeat"
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
      <div style={{ minWidth: "20rem" }}>
        {props.account ? (
          <AccountLoggedInView service={props.service} account={props.account} />
        ) : (
          <AccountLoggedOutView service={props.service} />
        )}
      </div>
    </Modal>
  );
}

interface IAccountLoggedInViewProps {
  service: Service;
  account: IAccount;
}

function AccountLoggedInView(props: IAccountLoggedInViewProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const { account, service } = props;
  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-center">Current Account</h2>
      {isLoading ? (
        <div className="my-4 text-center">
          <IconSpinner width={48} height={48} />
        </div>
      ) : (
        <>
          <div className="flex">
            <div className="flex-1 mr-2 text-lg">{account.name || `id: ${account.id}`}</div>
            <div>
              {account.numberOfPrograms != null && (
                <>
                  <span className="pr-2 align-middle">{account.numberOfPrograms}</span>
                  <span className="pr-4 align-middle">
                    <IconDoc width={12} height={16} />
                  </span>
                </>
              )}
              {account.numberOfWorkouts != null && (
                <>
                  <span className="pr-2 align-middle">{account.numberOfWorkouts}</span>
                  <span className="align-middle">
                    <IconDumbbell width={28} height={19} />
                  </span>
                </>
              )}
            </div>
          </div>
          {account.name && <div className="text-xs text-grayv2-main">id: {account.id}</div>}
          <div className="text-xs text-grayv2-main">
            {account.email === "noemail@example.com" ? (
              <></>
            ) : (
              <>
                Signed in as <span className="font-bold">{account.email}</span>
              </>
            )}
          </div>
          <div className="mt-4 text-center">
            <Button
              name="account-sign-out"
              kind="purple"
              data-cy="menu-item-logout"
              className="ls-logout"
              onClick={async () => {
                setIsLoading(true);
                await service.signout();
                window.location.reload();
              }}
            >
              Sign Out
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

interface IAccountLoggedOutViewProps {
  service: Service;
}

function AccountLoggedOutView(props: IAccountLoggedOutViewProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    window.AppleID.auth.init({
      clientId: "com.liftosaur.www.signinapple", // This is the service ID we created.
      scope: "email", // To tell apple we want the user name and emails fields in the response it sends us.
      redirectURI: `${__HOST__}/appleauthcallback.html`, // As registered along with our service ID
      usePopup: true, // Important if we want to capture the data apple sends on the client side.
    });
  }, []);

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-center">Account</h2>
      {isLoading ? (
        <div className="my-4 text-center">
          <IconSpinner width={48} height={48} />
        </div>
      ) : (
        <div>
          <div>
            <button
              className="flex items-center w-full px-4 py-2 mt-2 rounded-lg nm-sign-in-with-google"
              style={{ boxShadow: "0 1px 4px 0 rgba(0,0,0,0.1)" }}
              data-cy="menu-item-login"
              onClick={async () => {
                setIsLoading(true);
                const accessToken = await getGoogleAccessToken();
                if (accessToken != null) {
                  const userId = UidFactory.generateUid(8);
                  const result = await props.service.googleSignIn(accessToken, userId, {});
                  if (result.email) {
                    window.location.reload();
                  } else {
                    setIsLoading(false);
                    alert("Couldn't log in");
                  }
                }
              }}
            >
              <span className="">
                <IconGoogle />
              </span>
              <span className="flex-1">Sign in with Google</span>
            </button>
          </div>
          <div>
            <button
              className="flex items-center w-full px-4 py-3 mt-2 text-white rounded-lg bg-blackv2 nm-sign-in-with-apple"
              onClick={async () => {
                setIsLoading(true);
                const response = await window.AppleID.auth.signIn();
                const { id_token, code } = response.authorization;
                if (id_token != null && code != null) {
                  const userId = UidFactory.generateUid(8);
                  const result = await props.service.appleSignIn(code, id_token, userId);
                  if (result.email) {
                    window.location.reload();
                  } else {
                    setIsLoading(false);
                    alert("Couldn't log in");
                  }
                }
              }}
            >
              <span style={{ marginTop: "-3px" }}>
                <IconApple />
              </span>
              <span className="flex-1">Sign in with Apple</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
