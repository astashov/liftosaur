import { JSX, useEffect, useState } from "react";
import { View, Pressable, Platform } from "react-native";
import { Text } from "./primitives/text";
import { Service } from "../api/service";
import { IAccount } from "../models/account";
import { UidFactory_generateUid } from "../utils/generator";
import { getGoogleAccessToken } from "../utils/googleAccessToken";
import { Button } from "./button";
import { IconApple } from "./icons/iconApple";
import { IconDoc } from "./icons/iconDoc";
import { IconDumbbell } from "./icons/iconDumbbell";
import { IconGoogle } from "./icons/iconGoogle";
import { IconSpinner } from "./icons/iconSpinner";
import { IDispatch } from "../ducks/types";
import { IState } from "../models/state";
import { Thunk_googleSignIn, Thunk_appleSignIn } from "../ducks/thunks";
import { track } from "../utils/posthog";

interface IAccountProps {
  account?: IAccount;
  redirectUrl?: string;
  dispatch?: IDispatch;
  client: Window["fetch"];
  onSignIn?: (state: IState) => void;
}

declare let __HOST__: string;

const isWeb = Platform.OS === "web";

export function Account(props: IAccountProps): JSX.Element {
  const service = new Service(props.client);
  return (
    <View style={{ minWidth: 256, maxWidth: 416, alignSelf: "center", width: "100%" }}>
      {props.account ? (
        <AccountLoggedInView service={service} account={props.account} />
      ) : (
        <AccountLoggedOutView
          service={service}
          redirectUrl={props.redirectUrl}
          dispatch={props.dispatch}
          onSignIn={props.onSignIn}
        />
      )}
    </View>
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
    <View>
      <Text className="mb-4 text-lg font-bold text-center">Current Account</Text>
      {isLoading ? (
        <View className="items-center my-4">
          <IconSpinner width={48} height={48} />
        </View>
      ) : (
        <>
          <View className="flex-row items-center">
            <Text className="flex-1 mr-2 text-lg">{account.name || `id: ${account.id}`}</Text>
            <View className="flex-row items-center">
              {account.numberOfPrograms != null && (
                <>
                  <Text className="pr-2">{account.numberOfPrograms}</Text>
                  <View className="pr-4">
                    <IconDoc width={12} height={16} />
                  </View>
                </>
              )}
              {account.numberOfWorkouts != null && (
                <>
                  <Text className="pr-2">{account.numberOfWorkouts}</Text>
                  <View>
                    <IconDumbbell width={28} height={19} />
                  </View>
                </>
              )}
            </View>
          </View>
          {account.name && <Text className="text-xs text-text-secondary">id: {account.id}</Text>}
          {account.email !== "noemail@example.com" && (
            <Text className="text-xs text-text-secondary">
              Signed in as <Text className="font-bold">{account.email}</Text>
            </Text>
          )}
          <View className="items-center mt-4">
            <Button
              name="account-sign-out"
              kind="purple"
              data-cy="menu-item-logout" data-testid="menu-item-logout" testID="menu-item-logout"
              className="ls-logout"
              onClick={async () => {
                setIsLoading(true);
                await service.signout();
                if (isWeb && typeof window !== "undefined") {
                  window.location.reload();
                } else {
                  setIsLoading(false);
                }
              }}
            >
              Sign Out
            </Button>
          </View>
        </>
      )}
    </View>
  );
}

interface IAccountLoggedOutViewProps {
  service: Service;
  redirectUrl?: string;
  dispatch?: IDispatch;
  onSignIn?: (state: IState) => void;
}

function AccountLoggedOutView(props: IAccountLoggedOutViewProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isWeb) {
      return;
    }
    if (typeof window !== "undefined" && window.AppleID?.auth) {
      window.AppleID.auth.init({
        clientId: "com.liftosaur.www.signinapple",
        scope: "email",
        redirectURI: `${__HOST__}/appleauthcallback.html`,
        usePopup: true,
      });
    }
  }, []);

  return (
    <View>
      <Text className="mb-4 text-lg font-bold text-center">Account</Text>
      {isLoading ? (
        <View className="items-center my-4">
          <IconSpinner width={48} height={48} />
        </View>
      ) : (
        <View>
          <Pressable
            className="flex-row items-center w-full px-4 py-2 mt-2 rounded-lg nm-sign-in-with-google bg-background-default"
            style={Platform.select({
              ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 },
              android: { elevation: 2 },
              default: { boxShadow: "0 1px 4px 0 rgba(0,0,0,0.1)" },
            })}
            data-cy="menu-item-login" data-testid="menu-item-login"
            testID="menu-item-login"
            onPress={async () => {
              track({ name: "SignUp" });
              setIsLoading(true);
              if (props.dispatch) {
                props.dispatch(
                  Thunk_googleSignIn((newState) => {
                    setIsLoading(false);
                    props.onSignIn?.(newState);
                  })
                );
                return;
              }
              const accessToken = await getGoogleAccessToken(true);
              if (accessToken != null) {
                const userId = UidFactory_generateUid(8);
                const result = await props.service.googleSignIn(accessToken, userId, {});
                if (result.email) {
                  if (props.redirectUrl && typeof window !== "undefined") {
                    window.location.href = props.redirectUrl;
                  } else if (typeof window !== "undefined") {
                    window.location.reload();
                  }
                } else {
                  setIsLoading(false);
                }
              }
            }}
          >
            <View>
              <IconGoogle />
            </View>
            <Text className="flex-1 ml-2 text-base text-center">Sign in with Google</Text>
          </Pressable>
          <Pressable
            className="flex-row items-center w-full px-4 py-3 mt-2 bg-black rounded-lg nm-sign-in-with-apple"
            onPress={async () => {
              track({ name: "SignUp" });
              setIsLoading(true);
              if (props.dispatch) {
                props.dispatch(
                  Thunk_appleSignIn((newState) => {
                    setIsLoading(false);
                    props.onSignIn?.(newState);
                  })
                );
                return;
              }
              if (typeof window === "undefined" || !window.AppleID?.auth) {
                setIsLoading(false);
                return;
              }
              const response = await window.AppleID.auth.signIn();
              const { id_token, code } = response.authorization;
              if (id_token != null && code != null) {
                const userId = UidFactory_generateUid(8);
                const result = await props.service.appleSignIn(code, id_token, userId);
                if (result.email && typeof window !== "undefined") {
                  window.location.reload();
                } else {
                  setIsLoading(false);
                }
              }
            }}
          >
            <View style={{ marginTop: -3 }}>
              <IconApple />
            </View>
            <Text className="flex-1 ml-2 text-base text-center text-text-alwayswhite">Sign in with Apple</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
