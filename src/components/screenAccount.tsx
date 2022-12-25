import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";
import { ILoading } from "../models/state";
import { rightFooterButtons } from "./rightFooterButtons";
import { IScreen } from "../models/screen";
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

interface IProps {
  email?: string;
  loading: ILoading;
  screenStack: IScreen[];
  dispatch: IDispatch;
}

export function ScreenAccount(props: IProps): JSX.Element {
  const [currentAccount, setCurrentAccount] = useState<IAccount | undefined>(undefined);
  const [otherAccounts, setOtherAccounts] = useState<IAccount[]>([]);

  useEffect(() => {
    Account.getAll().then((accounts) => {
      const theCurrentAccount = accounts.filter((account) => account.isCurrent)[0];
      const theOtherAccounts = accounts.filter((account) => !account.isCurrent);
      setCurrentAccount(theCurrentAccount);
      setOtherAccounts(theOtherAccounts);
    });
  }, []);

  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          screenStack={props.screenStack}
          title="Account"
          helpContent={<HelpAccount />}
        />
      }
      footer={<Footer2View dispatch={props.dispatch} rightButtons={rightFooterButtons({ dispatch: props.dispatch })} />}
    >
      <section className="px-4 mt-4 text-base text-center">
        <GroupHeader name="Current Account" />
        {currentAccount && (
          <MenuItem
            name={currentAccount.name ? currentAccount.name : `id: ${currentAccount.id}`}
            value={
              <div>
                <span>{currentAccount.numberOfPrograms}</span>
                <span>
                  <IconDoc />
                </span>
                <span>{currentAccount.numberOfWorkouts}</span>
                <span>
                  <IconDumbbell />
                </span>
              </div>
            }
            addons={
              currentAccount.email ? <div>Logged in as {currentAccount.email}</div> : <div>Not logged in to cloud</div>
            }
          />
        )}
      </section>
    </Surface>
  );
}

function ScreenAccountLoggedOut(props: { dispatch: IDispatch }): JSX.Element {
  return (
    <Button
      kind="orange"
      className="mt-8"
      data-cy="menu-item-login"
      onClick={() => props.dispatch(Thunk.googleSignIn())}
    >
      Log in via Google
    </Button>
  );
}

function ScreenAccountLoggedIn(props: { email: string; dispatch: IDispatch }): JSX.Element {
  return (
    <Fragment>
      <section className="w-full px-6 py-4 text-center" data-cy="menu-item-current-account">
        Current account: <span className="text-grayv2-main">{props.email}</span>
      </section>
      <section className="flex-1 w-full">
        <Button
          kind="orange"
          data-cy="menu-item-logout"
          className="ls-logout"
          onClick={() => props.dispatch(Thunk.logOut())}
        >
          Log Out
        </Button>
      </section>
    </Fragment>
  );
}
