import { JSX, useEffect, useRef, useState } from "react";
import { View, Pressable, Platform } from "react-native";
import { Text } from "./primitives/text";
import { Service } from "../api/service";
import { IAccount } from "../models/account";
import { UidFactory_generateUid } from "../utils/generator";
import { getGoogleAccessToken } from "../utils/googleAccessToken";
import { Button } from "./button";
import { Input } from "./input";
import { LinkButton } from "./linkButton";
import { IconApple } from "./icons/iconApple";
import { IconDoc } from "./icons/iconDoc";
import { IconDumbbell } from "./icons/iconDumbbell";
import { IconGoogle } from "./icons/iconGoogle";
import { IconSpinner } from "./icons/iconSpinner";
import { IDispatch } from "../ducks/types";
import { IState } from "../models/state";
import { Thunk_googleSignIn, Thunk_appleSignIn, Thunk_emailAuth, Thunk_forgotPassword } from "../ducks/thunks";
import { IEmailAuthResult } from "../ducks/thunks";
import { track } from "../utils/posthog";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IAccountProps {
  account?: IAccount;
  redirectUrl?: string;
  dispatch?: IDispatch;
  client: Window["fetch"];
  onSignIn?: (state: IState) => void;
  // App-only: renders a "Sign in with Email" button opening the email-auth modal
  // instead of the inline form. Kept as a callback so this (server-rendered)
  // module never imports react-navigation
  onOpenEmailAuth?: () => void;
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
          onOpenEmailAuth={props.onOpenEmailAuth}
        />
      )}
    </View>
  );
}

const changePasswordErrorMessages: Record<string, string> = {
  invalid_credentials: "Current password is incorrect",
  invalid_password: "Password must be at least 8 characters",
  password_too_long: "Password must be at most 256 characters",
  not_authorized: "You're not signed in",
  network_error: "Network error, please try again",
};

export function ChangePasswordForm(props: { service: Service; onDone: () => void }): JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [done, setDone] = useState(false);
  const currentRef = useRef("");
  const newRef = useRef("");
  const repeatRef = useRef("");

  async function submit(): Promise<void> {
    setError(undefined);
    if (newRef.current.length < 8) {
      setError(changePasswordErrorMessages.invalid_password);
      return;
    }
    if (newRef.current !== repeatRef.current) {
      setError("Passwords don't match");
      return;
    }
    setIsSubmitting(true);
    const err = await props.service.changePassword(currentRef.current || undefined, newRef.current);
    setIsSubmitting(false);
    if (err) {
      setError(changePasswordErrorMessages[err] || "Something went wrong, please try again");
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <View className="items-center py-4">
        <Text className="text-center text-text-secondary">Your password has been updated.</Text>
        <View className="items-center mt-4">
          <Button name="change-password-done" kind="purple" onClick={() => props.onDone()}>
            Done
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Input
        label="Current password"
        identifier="change-password-current"
        type="password"
        changeType="oninput"
        autoCapitalize="none"
        autoCorrect={false}
        changeHandler={(r) => {
          if (r.success) {
            currentRef.current = r.data;
          }
        }}
      />
      <Text className="mt-1 text-xs text-text-secondary">
        Leave blank if you sign in with Google or Apple and haven't set a password yet.
      </Text>
      <View className="mt-3">
        <Input
          label="New password"
          identifier="change-password-new"
          type="password"
          changeType="oninput"
          autoCapitalize="none"
          autoCorrect={false}
          changeHandler={(r) => {
            if (r.success) {
              newRef.current = r.data;
            }
          }}
        />
      </View>
      <View className="mt-3">
        <Input
          label="Repeat new password"
          identifier="change-password-repeat"
          type="password"
          changeType="oninput"
          autoCapitalize="none"
          autoCorrect={false}
          changeHandler={(r) => {
            if (r.success) {
              repeatRef.current = r.data;
            }
          }}
        />
      </View>
      {error && <Text className="mt-2 text-xs text-text-error">{error}</Text>}
      <View className="items-center mt-4">
        <Button
          name="change-password-submit"
          kind="purple"
          testID="change-password-submit"
          data-testid="change-password-submit"
          className="min-w-32"
          disabled={isSubmitting}
          onClick={() => submit()}
        >
          {isSubmitting ? (
            <IconSpinner width={20} height={20} color={Tailwind_semantic().text.alwayswhite} />
          ) : (
            "Change Password"
          )}
        </Button>
      </View>
    </View>
  );
}

interface IAccountLoggedInViewProps {
  service: Service;
  account: IAccount;
}

function AccountLoggedInView(props: IAccountLoggedInViewProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const { account, service } = props;

  if (showChangePassword) {
    return (
      <View>
        <Text className="mb-4 text-lg font-bold text-center">Change Password</Text>
        <ChangePasswordForm service={service} onDone={() => setShowChangePassword(false)} />
        <View className="items-center mt-4">
          <LinkButton name="change-password-back" className="text-xs" onPress={() => setShowChangePassword(false)}>
            Back
          </LinkButton>
        </View>
      </View>
    );
  }

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
              Signed in as <Text className="text-xs font-bold text-text-secondary">{account.email}</Text>
            </Text>
          )}
          <View className="items-center mt-4">
            <Button
              name="account-sign-out"
              kind="purple"
              data-testid="menu-item-logout"
              testID="menu-item-logout"
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
            <View className="mt-3">
              <LinkButton
                name="account-change-password"
                className="text-sm"
                onPress={() => setShowChangePassword(true)}
              >
                Change password
              </LinkButton>
            </View>
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
  onOpenEmailAuth?: () => void;
}

function AccountLoggedOutView(props: IAccountLoggedOutViewProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

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
      ) : showEmailForm ? (
        <View>
          <EmailAuthForm service={props.service} redirectUrl={props.redirectUrl} onSignIn={props.onSignIn} />
          <View className="items-center mt-4">
            <LinkButton name="email-auth-back" className="text-xs" onPress={() => setShowEmailForm(false)}>
              Back to sign in options
            </LinkButton>
          </View>
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
            data-testid="menu-item-login"
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
          <EmailAuthButton onPress={props.onOpenEmailAuth || (() => setShowEmailForm(true))} />
        </View>
      )}
    </View>
  );
}

export function EmailAuthButton(props: { onPress: () => void }): JSX.Element {
  return (
    <View className="items-center mt-3">
      <LinkButton name="menu-item-login-email" className="text-xs" onPress={props.onPress}>
        or use email login
      </LinkButton>
    </View>
  );
}

export type IEmailAuthMode = "signin" | "signup" | "forgot";

const emailAuthErrorMessages: Record<string, string> = {
  invalid_email: "Please enter a valid email address",
  invalid_password: "Password must be at least 8 characters",
  password_too_long: "Password must be at most 256 characters",
  account_exists: "An account with this email already exists - sign in instead",
  invalid_credentials: "Wrong email or password",
  account_not_found: "No account exists with this email",
  wrong_password: "Wrong password",
  too_many_attempts: "Too many attempts, try again in 15 minutes",
  email_send_failed: "Couldn't send the confirmation email, please try again later",
  network_error: "Network error, please try again",
};

interface IEmailAuthFormProps {
  // Required only for the web no-dispatch path; in-app callers pass dispatch and go through thunks
  service?: Service;
  redirectUrl?: string;
  dispatch?: IDispatch;
  onSignIn?: (state: IState) => void;
  onModeChange?: (mode: IEmailAuthMode) => void;
}

export function EmailAuthForm(props: IEmailAuthFormProps): JSX.Element {
  const [mode, setMode] = useState<IEmailAuthMode>("signin");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [info, setInfo] = useState<string | undefined>(undefined);
  const emailRef = useRef("");
  const passwordRef = useRef("");

  function switchMode(newMode: IEmailAuthMode): void {
    setMode(newMode);
    setError(undefined);
    setInfo(undefined);
    props.onModeChange?.(newMode);
  }

  function handleResult(result: IEmailAuthResult): void {
    setIsSubmitting(false);
    if (result.error === "use_oauth") {
      const providers = result.providers?.length ? result.providers : ["Google", "Apple"];
      setError(`This email signs in with ${providers.join(" or ")}`);
    } else if (result.error) {
      setError(emailAuthErrorMessages[result.error] || "Something went wrong, please try again");
    } else if (result.confirmationSent) {
      setInfo(
        "This email already has a Liftosaur account. We've emailed you a link to set a password for it - check your email."
      );
    }
  }

  async function submit(): Promise<void> {
    const email = emailRef.current.trim();
    const password = passwordRef.current;
    setError(undefined);
    setInfo(undefined);
    if (mode === "forgot") {
      if (!email) {
        setError(emailAuthErrorMessages.invalid_email);
        return;
      }
      setIsSubmitting(true);
      const onSent = (result: IEmailAuthResult): void => {
        if (result.error) {
          handleResult(result);
        } else {
          setIsSubmitting(false);
          setInfo(`We've sent an email with instructions to ${email}.`);
        }
      };
      if (props.dispatch) {
        props.dispatch(Thunk_forgotPassword(email, onSent));
      } else if (props.service) {
        onSent(await props.service.forgotPassword(email));
      }
      return;
    }
    if (mode === "signup") {
      track({ name: "SignUp" });
    }
    setIsSubmitting(true);
    if (props.dispatch) {
      props.dispatch(
        Thunk_emailAuth(mode, email, password, (result, newState) => {
          handleResult(result);
          if (!result.error && !result.confirmationSent) {
            props.onSignIn?.(newState);
          }
        })
      );
      return;
    }
    if (!props.service) {
      setIsSubmitting(false);
      return;
    }
    const userId = UidFactory_generateUid(8);
    const result =
      mode === "signup"
        ? await props.service.emailSignUp(email, password, userId)
        : await props.service.emailSignIn(email, password, userId);
    if (result.type === "success" && typeof window !== "undefined") {
      if (props.redirectUrl) {
        window.location.href = props.redirectUrl;
      } else {
        window.location.reload();
      }
      return;
    }
    handleResult(
      result.type === "error"
        ? { error: result.error, providers: result.providers }
        : result.type === "confirmation_sent"
          ? { confirmationSent: true }
          : {}
    );
  }

  return (
    <View className="mt-2">
      <Input
        label="Email"
        identifier="email-auth-email"
        type="email"
        changeType="oninput"
        autoCapitalize="none"
        autoCorrect={false}
        changeHandler={(r) => {
          if (r.success) {
            emailRef.current = r.data;
          }
        }}
      />
      {mode !== "forgot" && (
        <View className="mt-2">
          <Input
            label="Password"
            identifier="email-auth-password"
            type="password"
            changeType="oninput"
            autoCapitalize="none"
            autoCorrect={false}
            changeHandler={(r) => {
              if (r.success) {
                passwordRef.current = r.data;
              }
            }}
          />
        </View>
      )}
      {error && <Text className="mt-2 text-xs text-text-error">{error}</Text>}
      {info && <Text className="mt-2 text-xs text-text-secondary">{info}</Text>}
      <View className="items-center mt-3">
        <Button
          name={`email-auth-${mode}`}
          kind="purple"
          testID="email-auth-submit"
          data-testid="email-auth-submit"
          className="min-w-32"
          disabled={isSubmitting}
          onClick={() => submit()}
        >
          {isSubmitting ? (
            <IconSpinner width={20} height={20} color={Tailwind_semantic().text.alwayswhite} />
          ) : mode === "signin" ? (
            "Sign In"
          ) : mode === "signup" ? (
            "Create Account"
          ) : (
            "Send Reset Link"
          )}
        </Button>
      </View>
      <View className="flex-row justify-between mt-4 gap-4">
        {mode !== "signin" && (
          <LinkButton name="email-auth-mode-signin" className="text-sm" onPress={() => switchMode("signin")}>
            Sign in
          </LinkButton>
        )}
        {mode !== "signup" && (
          <LinkButton name="email-auth-mode-signup" className="text-sm" onPress={() => switchMode("signup")}>
            Create account
          </LinkButton>
        )}
        {mode !== "forgot" && (
          <LinkButton name="email-auth-mode-forgot" className="text-sm" onPress={() => switchMode("forgot")}>
            Forgot password?
          </LinkButton>
        )}
      </View>
    </View>
  );
}
