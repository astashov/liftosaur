import { h, JSX, Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Service } from "../api/service";
import { IAccount } from "../models/account";
import { UidFactory } from "../utils/generator";
import { getGoogleAccessToken } from "../utils/googleAccessToken";
import { Button } from "./button";
import { IconApple } from "./icons/iconApple";
import { IconDoc } from "./icons/iconDoc";
import { IconDumbbell } from "./icons/iconDumbbell";
import { IconGoogle } from "./icons/iconGoogle";
import { IconSpinner } from "./icons/iconSpinner";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";

interface IAccountProps {
  account?: IAccount;
  redirectUrl?: string;
  dispatch?: IDispatch;
  client: Window["fetch"];
}

declare let __HOST__: string;

export function Account(props: IAccountProps): JSX.Element {
  const service = new Service(props.client);
  return (
    <div style={{ minWidth: "16rem", maxWidth: "26rem" }}>
      {props.account ? (
        <AccountLoggedInView service={service} account={props.account} />
      ) : (
        <AccountLoggedOutView service={service} redirectUrl={props.redirectUrl} dispatch={props.dispatch} />
      )}
    </div>
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
  redirectUrl?: string;
  dispatch?: IDispatch;
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
                if (props.dispatch) {
                  props.dispatch(Thunk.googleSignIn(() => setIsLoading(false)));
                  return;
                }
                const accessToken = await getGoogleAccessToken();
                if (accessToken != null) {
                  const userId = UidFactory.generateUid(8);
                  const result = await props.service.googleSignIn(accessToken, userId, {});
                  if (result.email) {
                    if (props.redirectUrl) {
                      window.location.href = props.redirectUrl;
                    } else {
                      window.location.reload();
                    }
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
                if (props.dispatch) {
                  props.dispatch(Thunk.appleSignIn(() => setIsLoading(false)));
                  return;
                }
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
