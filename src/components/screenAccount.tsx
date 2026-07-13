import { JSX, useEffect, useState } from "react";
import { View, Pressable, Platform, AppState } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import {
  Thunk_logOut,
  Thunk_googleSignIn,
  Thunk_appleSignIn,
  Thunk_switchAccount,
  Thunk_deleteAccount,
  Thunk_createAccount,
  Thunk_deleteAccountRemote,
  Thunk_pushScreen,
  Thunk_openManageSubscriptions,
  Thunk_iapRefreshActiveSubscriptions,
  Thunk_fetchAccounts,
} from "../ducks/thunks";
import { INavCommon } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";
import { Button } from "./button";
import { IAccount } from "../models/account";
import { AdminDebug_isDebugAccountId } from "../models/adminDebug";
import { IPartialStorage } from "../types";
import { GroupHeader } from "./groupHeader";
import { MenuItem } from "./menuItem";
import { IconDoc } from "./icons/iconDoc";
import { IconDumbbell } from "./icons/iconDumbbell";
import { IconGoogle } from "./icons/iconGoogle";
import { LinkButton } from "./linkButton";
import { IconTrash } from "./icons/iconTrash";
import { IconApple } from "./icons/iconApple";
import { IconSpinner } from "./icons/iconSpinner";
import { Dialog_confirm, Dialog_prompt, Dialog_alert } from "../utils/dialog";
import { Tailwind_colors, Tailwind_semantic } from "../utils/tailwindConfig";
import { IIapActiveSubscription } from "../utils/iapAdapter";
import { SubscriptionPlan_derive, ISubscriptionPlanKind, IDerivedSubscriptionPlan } from "../utils/subscriptionPlan";
import { DateUtils_format } from "../utils/date";

declare let __HOST__: string;

interface IProps {
  email?: string;
  userId?: string;
  nosync?: boolean;
  storage: IPartialStorage;
  subscriptionStatus?: IIapActiveSubscription[];
  subscriptionStatusLoading?: boolean;
  ownedLifetime?: boolean;
  navCommon: INavCommon;
  dispatch: IDispatch;
}

export function ScreenAccount(props: IProps): JSX.Element {
  const [otherAccounts, setOtherAccounts] = useState<IAccount[]>([]);
  const [isOtherAccountsEditMode, setIsOtherAccountsEditMode] = useState<boolean>(false);

  const currentAccountId = props.userId || props.storage.tempUserId;
  const currentAccount: IAccount = {
    id: currentAccountId,
    email: props.email,
    name: props.storage.settings.nickname,
    numberOfPrograms: props.storage.programs?.length ?? 0,
    numberOfWorkouts: props.storage.history?.length ?? 0,
    affiliateEnabled: props.storage.settings.affiliateEnabled,
    isCurrent: true,
  };

  function refetchAccounts(): void {
    props.dispatch(
      Thunk_fetchAccounts((accounts) => {
        setOtherAccounts(accounts.filter((a) => a.id !== currentAccountId));
      })
    );
  }

  useEffect(() => {
    refetchAccounts();
  }, [currentAccountId]);

  useEffect(() => {
    props.dispatch(Thunk_iapRefreshActiveSubscriptions());
    // Re-check on foreground so a cancel/change made in the system subscription manager (App Store /
    // Google Play) — e.g. after tapping "Cancel subscription" here — is reflected when the user returns.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        props.dispatch(Thunk_iapRefreshActiveSubscriptions());
      }
    });
    return () => sub.remove();
  }, []);

  const isNative = Platform.OS === "ios" || Platform.OS === "android";
  const plan = SubscriptionPlan_derive({
    subscription: props.storage.subscription,
    status: props.subscriptionStatus,
    ownedLifetime: props.ownedLifetime,
    isNative,
    isIos: Platform.OS === "ios",
  });
  // "loading" = native subscriber whose store status hasn't arrived yet (status undefined). Spinning here
  // (rather than flashing "Free plan") covers the first render and a failed getActiveSubscriptions(); once a
  // known status arrives a re-check keeps showing it instead of flipping back to a spinner.
  const isLoadingSubscription = plan.state === "loading";

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.AppleID?.auth) {
      window.AppleID.auth.init({
        clientId: "com.liftosaur.www.signinapple",
        scope: "email",
        redirectURI: `${__HOST__}/appleauthcallback.html`,
        usePopup: true,
      });
    }
  }, []);

  useNavOptions({ navTitle: "Account", navHelpKey: "account" });

  const premiumCard = buildPremiumCard(plan);

  const semantic = Tailwind_semantic();
  const colors = Tailwind_colors();
  const googleShadow = Platform.select({
    ios: {
      shadowColor: semantic.background.default === colors.black ? colors.white : colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: { elevation: 2 },
    default: { boxShadow: "0 1px 4px 0 rgba(0,0,0,0.1)" },
  });

  return (
    <View className="px-4">
      <GroupHeader name="Current Account" />
      <MenuItem
        isBorderless={true}
        expandName={true}
        name={currentAccount.name ? currentAccount.name : `id: ${currentAccount.id}`}
        value={
          <View className="flex-row items-center">
            <Text className="pr-2 text-text-primary">{currentAccount.numberOfPrograms}</Text>
            <View className="pr-4">
              <IconDoc width={12} height={16} />
            </View>
            <Text className="pr-2 text-text-primary">{currentAccount.numberOfWorkouts}</Text>
            <View>
              <IconDumbbell width={28} height={19} />
            </View>
          </View>
        }
        addons={
          <View>
            {AdminDebug_isDebugAccountId(currentAccount.id) ? (
              <Text className="-mt-1 text-xs font-bold text-text-error">
                {props.nosync ? "DEBUG · sync off" : "DEBUG · sync ON (server)"}
              </Text>
            ) : null}
            {currentAccount.name ? (
              <Text className="-mt-1 text-xs text-text-secondary">{`id: ${currentAccount.id}`}</Text>
            ) : null}
            {props.email ? (
              props.email === "noemail@example.com" ? null : (
                <Text className="text-xs text-text-secondary">
                  Signed in as <Text className="text-sm font-bold text-text-secondary">{props.email}</Text>
                </Text>
              )
            ) : (
              <Text className="text-xs text-text-error">Not signed in to cloud</Text>
            )}
          </View>
        }
      />
      {props.email ? (
        <View className="items-center">
          <Button
            name="account-sign-out"
            kind="purple"
            data-testid="menu-item-logout"
            className="ls-logout"
            onClick={() => props.dispatch(Thunk_logOut())}
          >
            Sign Out
          </Button>
        </View>
      ) : (
        <View>
          <Pressable
            className="flex-row items-center w-full px-4 py-2 mt-2 rounded-lg nm-sign-in-with-google bg-background-default"
            style={googleShadow}
            data-testid="menu-item-login"
            testID="menu-item-login"
            onPress={() => props.dispatch(Thunk_googleSignIn())}
          >
            <View>
              <IconGoogle />
            </View>
            <Text className="flex-1 ml-2 text-base text-center">Sign in with Google</Text>
          </Pressable>
          <Pressable
            className="flex-row items-center w-full px-4 py-3 mt-2 bg-black rounded-lg nm-sign-in-with-apple"
            onPress={() => props.dispatch(Thunk_appleSignIn())}
          >
            <View style={{ marginTop: -3 }}>
              <IconApple />
            </View>
            <Text className="flex-1 ml-2 text-base text-center text-text-alwayswhite">Sign in with Apple</Text>
          </Pressable>
        </View>
      )}
      <GroupHeader name="🌟 Liftosaur Premium" topPadding={true} />
      {isLoadingSubscription ? (
        <MenuItem name="Checking your subscription…" expandName={true} value={<IconSpinner width={18} height={18} />} />
      ) : (
        <>
          <MenuItem
            name={premiumCard.title}
            value={premiumCard.actionLabel}
            shouldShowRightArrow={!!premiumCard.actionLabel}
            expandName={true}
            onClick={premiumCard.actionLabel ? () => props.dispatch(Thunk_pushScreen("subscription")) : undefined}
            addons={
              premiumCard.subtitle ? (
                <Text className="-mt-1 text-xs text-text-secondary">{premiumCard.subtitle}</Text>
              ) : undefined
            }
          />
          {premiumCard.showCancel && (
            <View className="pt-1">
              <LinkButton
                name="account-cancel-subscription"
                className="text-sm text-text-error"
                onClick={() => props.dispatch(Thunk_openManageSubscriptions())}
              >
                Cancel subscription
              </LinkButton>
            </View>
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
          key={account.id}
          shouldShowRightArrow={!isOtherAccountsEditMode}
          name={account.name ? account.name : `id: ${account.id}`}
          onClick={async () => {
            if (
              !isOtherAccountsEditMode &&
              (await Dialog_confirm(
                "Want to switch to this account? You WILL NOT lose your current account, you'll be able to switch back to it later."
              ))
            ) {
              props.dispatch(Thunk_switchAccount(account.id));
            }
          }}
          value={
            isOtherAccountsEditMode ? (
              <Pressable
                className="p-2 nm-account-delete-account"
                onPress={async () => {
                  const answer = await Dialog_prompt(
                    "Are you sure? All the local data for this account will be lost, and you won't be able to restore it unless you have a cloud account. Type 'delete' to confirm."
                  );
                  if (answer?.toLocaleLowerCase() === "delete") {
                    props.dispatch(Thunk_deleteAccount(account.id, () => refetchAccounts()));
                  }
                }}
              >
                <IconTrash />
              </Pressable>
            ) : (
              <View className="flex-row items-center">
                <Text className="pr-2 text-text-primary">{account.numberOfPrograms}</Text>
                <View className="pr-4">
                  <IconDoc width={12} height={16} />
                </View>
                <Text className="pr-2 text-text-primary">{account.numberOfWorkouts}</Text>
                <View>
                  <IconDumbbell width={28} height={19} />
                </View>
              </View>
            )
          }
          expandName={true}
          addons={
            <View>
              {AdminDebug_isDebugAccountId(account.id) ? (
                <Text className="-mt-1 text-xs font-bold text-text-error">DEBUG · sync off</Text>
              ) : null}
              {account.name ? <Text className="-mt-1 text-xs text-text-secondary">{`id: ${account.id}`}</Text> : null}
              {account.email && account.email !== "noemail@example.com" && (
                <Text className="text-xs text-text-secondary">
                  Was logged in as <Text className="text-sm font-bold text-text-secondary">{account.email}</Text>
                </Text>
              )}
            </View>
          }
        />
      ))}
      <LinkButton
        name="local-account-create"
        onClick={async () => {
          if (
            await Dialog_confirm(
              "Want to create a new local account? You WILL NOT lose your current account, you'll be able to switch back to it later."
            )
          ) {
            props.dispatch(Thunk_createAccount());
          }
        }}
      >
        Create New Local Account
      </LinkButton>
      <GroupHeader name="Delete current account" topPadding={true} />
      <View>
        <Button
          name="account-delete"
          kind="red"
          className="mt-4 ls-delete-account"
          onClick={async () => {
            const answer = await Dialog_prompt(
              "Are you sure? All the local data for this account will be lost, and you won't be able to restore it unless you have a cloud account. Type 'delete' to confirm."
            );
            if (answer?.toLocaleLowerCase() === "delete") {
              props.dispatch(
                Thunk_logOut(() => {
                  props.dispatch(Thunk_deleteAccount(currentAccount.id));
                  props.dispatch(Thunk_createAccount());
                })
              );
            }
          }}
        >
          Delete Current Local Account
        </Button>
      </View>
      {props.email && (
        <View>
          <Button
            name="account-delete-remote"
            kind="red"
            className="mt-4 ls-delete-account-remote"
            onClick={async () => {
              const answer = await Dialog_prompt(
                "Are you sure? All the data for this account will be deleted from the cloud, and you won't be able to restore it unless you resignup and sync your data again. Type 'delete' to confirm."
              );
              if (answer?.toLocaleLowerCase() === "delete") {
                props.dispatch(
                  Thunk_deleteAccountRemote((result) => {
                    if (result) {
                      Dialog_alert("Account deleted from cloud.");
                    } else {
                      Dialog_alert(
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
        </View>
      )}
    </View>
  );
}

interface IPremiumCard {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  showCancel: boolean;
}

function buildPremiumCard(plan: IDerivedSubscriptionPlan): IPremiumCard {
  const planKindLabel = (k?: ISubscriptionPlanKind): string =>
    k === "yearly" ? "Yearly" : k === "monthly" ? "Monthly" : "Premium";
  const dateStr = plan.expirationDate ? DateUtils_format(plan.expirationDate, true) : undefined;
  switch (plan.state) {
    case "subscriber":
      return {
        title: `Premium — ${planKindLabel(plan.plan)}`,
        subtitle: dateStr ? `Renews on ${dateStr}` : "Active subscription",
        actionLabel: "Manage",
        showCancel: true,
      };
    case "cancelled":
      return {
        title: `Premium — ${planKindLabel(plan.plan)}`,
        subtitle: dateStr ? `Ends on ${dateStr}, won't renew` : "Won't renew",
        actionLabel: "Manage",
        showCancel: false,
      };
    case "lifetime":
      return {
        title: "Lifetime Premium",
        subtitle: "All features unlocked forever",
        actionLabel: "View",
        showCancel: false,
      };
    case "freeaccess":
      return {
        title: "Free access",
        subtitle: "All features unlocked",
        actionLabel: "View",
        showCancel: false,
      };
    case "premium":
      return { title: "Premium", subtitle: "Manage on the mobile app", actionLabel: "Manage", showCancel: false };
    case "otherstore":
      return {
        title: "Premium",
        subtitle:
          plan.managedOn === "apple"
            ? "Bought on the App Store — manage it on an Apple device"
            : "Bought on Google Play — manage it on an Android device",
        actionLabel: "View",
        showCancel: false,
      };
    default:
      return { title: "Free plan", actionLabel: "Get Premium", showCancel: false };
  }
}
