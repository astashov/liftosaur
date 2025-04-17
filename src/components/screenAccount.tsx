import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";
import { INavCommon } from "../models/state";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { Button } from "./button";
import { HelpAccount } from "./help/helpAccount";
import { Account, IAccount } from "../models/account";
import { useEffect, useState } from "preact/hooks";
import { GroupHeader } from "./groupHeader";
import { MenuItem } from "./menuItem";
import { IconDoc } from "./icons/iconDoc";
import { IconDumbbell } from "./icons/iconDumbbell";
import { IconGoogle } from "./icons/iconGoogle";
import { LinkButton } from "./linkButton";
import { IconTrash } from "./icons/iconTrash";
import { IconApple } from "./icons/iconApple";

declare let __HOST__: string;

interface IProps {
  email?: string;
  navCommon: INavCommon;
  dispatch: IDispatch;
}

export function ScreenAccount(props: IProps): JSX.Element {
  const [currentAccount, setCurrentAccount] = useState<IAccount | undefined>(undefined);
  const [otherAccounts, setOtherAccounts] = useState<IAccount[]>([]);
  const [isOtherAccountsEditMode, setIsOtherAccountsEditMode] = useState<boolean>(false);

  function refetchAccounts(): void {
    Account.getAll().then((accounts) => {
      const theCurrentAccount = accounts.filter((account) => account.isCurrent)[0];
      const theOtherAccounts = accounts.filter((account) => !account.isCurrent);
      setCurrentAccount(theCurrentAccount);
      setOtherAccounts(theOtherAccounts);
    });
  }

  useEffect(() => {
    refetchAccounts();
    window.AppleID.auth.init({
      clientId: "com.liftosaur.www.signinapple", // This is the service ID we created.
      scope: "email", // To tell apple we want the user name and emails fields in the response it sends us.
      redirectURI: `${__HOST__}/appleauthcallback.html`, // As registered along with our service ID
      usePopup: true, // Important if we want to capture the data apple sends on the client side.
    });
  }, []);

  return (
    <Surface
      navbar={
        <NavbarView
          navCommon={props.navCommon}
          dispatch={props.dispatch}
          title="Account"
          helpContent={<HelpAccount />}
        />
      }
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
    >
      <section className="px-4">
        <GroupHeader name="Current Account" />
        {currentAccount && (
          <>
            <MenuItem
              isBorderless={true}
              name={currentAccount.name ? currentAccount.name : `id: ${currentAccount.id}`}
              value={
                <div className="text-blackv2">
                  <span className="pr-2 align-middle">{currentAccount.numberOfPrograms}</span>
                  <span className="pr-4 align-middle">
                    <IconDoc width={12} height={16} />
                  </span>
                  <span className="pr-2 align-middle">{currentAccount.numberOfWorkouts}</span>
                  <span className="align-middle">
                    <IconDumbbell width={28} height={19} />
                  </span>
                </div>
              }
              addons={
                <div className="text-xs text-grayv2-main">
                  {currentAccount.name ? (
                    <div style={{ marginTop: "-0.25rem" }}>{`id: ${currentAccount.id}`}</div>
                  ) : (
                    <></>
                  )}
                  {props.email ? (
                    props.email === "noemail@example.com" ? (
                      <></>
                    ) : (
                      <>
                        Signed in as <span className="font-bold">{props.email}</span>
                      </>
                    )
                  ) : (
                    <span className="text-redv2-main">Not signed in to cloud</span>
                  )}
                </div>
              }
            />
            {props.email ? (
              <div className="text-center">
                <Button
                  name="account-sign-out"
                  kind="purple"
                  data-cy="menu-item-logout"
                  className="ls-logout"
                  onClick={() => props.dispatch(Thunk.logOut())}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div>
                <div>
                  <button
                    className="flex items-center w-full px-4 py-2 mt-2 rounded-lg nm-sign-in-with-google"
                    style={{ boxShadow: "0 1px 4px 0 rgba(0,0,0,0.1)" }}
                    data-cy="menu-item-login"
                    onClick={() => props.dispatch(Thunk.googleSignIn())}
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
                      props.dispatch(Thunk.appleSignIn());
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
          </>
        )}
        <GroupHeader
          name="Other local accounts"
          topPadding={true}
          rightAddOn={
            otherAccounts.length > 0 ? (
              <LinkButton
                name="account-edit"
                onClick={() => {
                  setIsOtherAccountsEditMode(!isOtherAccountsEditMode);
                }}
              >
                {isOtherAccountsEditMode ? "Finish Editing" : "Edit"}
              </LinkButton>
            ) : undefined
          }
        />
        {otherAccounts.map((account) => (
          <MenuItem
            shouldShowRightArrow={!isOtherAccountsEditMode}
            name={account.name ? account.name : `id: ${account.id}`}
            onClick={() => {
              if (
                !isOtherAccountsEditMode &&
                confirm(
                  "Want to switch to this account? You WILL NOT lose your current account, you'll be able to switch back to it later."
                )
              ) {
                props.dispatch(Thunk.switchAccount(account.id));
              }
            }}
            value={
              <div className="text-blackv2">
                {isOtherAccountsEditMode ? (
                  <>
                    <button
                      className="p-2 align-middle button nm-account-delete-account"
                      onClick={() => {
                        if (
                          prompt(
                            "Are you sure? All the local data for this account will be lost, and you won't be able to restore it unless you have a cloud account. Type 'delete' to confirm."
                          )?.toLocaleLowerCase() === "delete"
                        ) {
                          props.dispatch(Thunk.deleteAccount(account.id, () => refetchAccounts()));
                        }
                      }}
                    >
                      <IconTrash />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="pr-2 align-middle">{account.numberOfPrograms}</span>
                    <span className="pr-4 align-middle">
                      <IconDoc width={12} height={16} />
                    </span>
                    <span className="pr-2 align-middle">{account.numberOfWorkouts}</span>
                    <span className="align-middle">
                      <IconDumbbell width={28} height={19} />
                    </span>
                  </>
                )}
              </div>
            }
            addons={
              <div className="text-xs text-grayv2-main">
                {account.name ? <div style={{ marginTop: "-0.25rem" }}>{`id: ${account.id}`}</div> : <></>}
                {account.email && account.email !== "noemail@example.com" && (
                  <>
                    Was logged in as <span className="font-bold">{account.email}</span>
                  </>
                )}
              </div>
            }
          />
        ))}
        <LinkButton
          name="local-account-create"
          onClick={() => {
            if (
              confirm(
                "Want to create a new local account? You WILL NOT lose your current account, you'll be able to switch back to it later."
              )
            ) {
              props.dispatch(Thunk.createAccount());
            }
          }}
        >
          Create New Local Account
        </LinkButton>
        {currentAccount && (
          <>
            <GroupHeader name="Delete current account" topPadding={true} />
            <div>
              <Button
                name="account-delete"
                kind="red"
                className="mt-4 ls-delete-account"
                onClick={() => {
                  if (
                    prompt(
                      "Are you sure? All the local data for this account will be lost, and you won't be able to restore it unless you have a cloud account. Type 'delete' to confirm."
                    )?.toLocaleLowerCase() === "delete"
                  ) {
                    props.dispatch(
                      Thunk.logOut(() => {
                        props.dispatch(Thunk.deleteAccount(currentAccount.id));
                        props.dispatch(Thunk.createAccount());
                      })
                    );
                  }
                }}
              >
                Delete Current Local Account
              </Button>
            </div>
            {props.email && (
              <div>
                <Button
                  name="account-delete-remote"
                  kind="red"
                  className="mt-4 ls-delete-account-remote"
                  onClick={() => {
                    if (
                      prompt(
                        "Are you sure? All the data for this account will be deleted from the cloud, and you won't be able to restore it unless you resignup and sync your data again. Type 'delete' to confirm."
                      )?.toLocaleLowerCase() === "delete"
                    ) {
                      props.dispatch(
                        Thunk.deleteAccountRemote((result) => {
                          if (result) {
                            alert("Account deleted from cloud.");
                          } else {
                            alert(
                              "Couldn't delete the account from the cloud - error happened. Please send an email to info@liftosaur.com to delete it."
                            );
                          }
                        })
                      );
                    }
                  }}
                >
                  Delete Current Cloud Account
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </Surface>
  );
}
