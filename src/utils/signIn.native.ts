import { Platform } from "react-native";
import {
  GoogleSignin,
  statusCodes,
  isSuccessResponse,
  isErrorWithCode,
} from "@react-native-google-signin/google-signin";
import appleAuth from "@invertase/react-native-apple-authentication";
import InAppBrowser from "react-native-inappbrowser-reborn";

export interface IGoogleSignInResult {
  idToken?: string;
  accessToken?: string;
}

export interface IAppleSignInResult {
  idToken: string;
  code?: string;
}

const APPLE_SERVICE_ID = "com.liftosaur.www.signinapple";
const APPLE_REDIRECT_URI = "https://www.liftosaur.com/appleauthcallback-mobile.html";
const APPLE_DEEP_LINK_SCHEME = "com.liftosaur.www://apple-callback";

export async function SignIn_google(): Promise<IGoogleSignInResult | undefined> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isSuccessResponse(response)) {
      const tokens = await GoogleSignin.getTokens();
      return {
        idToken: response.data.idToken ?? undefined,
        accessToken: tokens.accessToken,
      };
    }
    return undefined;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
      return undefined;
    }
    throw error;
  }
}

export async function SignIn_apple(): Promise<IAppleSignInResult | undefined> {
  if (Platform.OS === "ios") {
    return SignIn_appleIos();
  }
  if (Platform.OS === "android") {
    return SignIn_appleAndroid();
  }
  throw new Error(`SignIn_apple not supported on ${Platform.OS}`);
}

async function SignIn_appleIos(): Promise<IAppleSignInResult | undefined> {
  const response = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.EMAIL],
  });
  if (response.identityToken == null) {
    return undefined;
  }
  return {
    idToken: response.identityToken,
    code: response.authorizationCode ?? undefined,
  };
}

async function SignIn_appleAndroid(): Promise<IAppleSignInResult | undefined> {
  const state = generateState();
  const params = new URLSearchParams({
    response_type: "code id_token",
    client_id: APPLE_SERVICE_ID,
    redirect_uri: APPLE_REDIRECT_URI,
    scope: "email",
    response_mode: "form_post",
    state,
  });
  const authUrl = `https://appleid.apple.com/auth/authorize?${params.toString()}`;

  const isAvailable = await InAppBrowser.isAvailable();
  if (!isAvailable) {
    throw new Error("In-app browser is not available on this device");
  }

  const result = await InAppBrowser.openAuth(authUrl, APPLE_DEEP_LINK_SCHEME, {
    showTitle: false,
    enableUrlBarHiding: true,
    enableDefaultShare: false,
    ephemeralWebSession: false,
  });

  if (result.type !== "success" || !("url" in result) || !result.url) {
    return undefined;
  }
  const url = new URL(result.url);
  const returnedState = url.searchParams.get("state");
  if (returnedState !== state) {
    throw new Error("Apple sign-in state mismatch");
  }
  const idToken = url.searchParams.get("id_token");
  const code = url.searchParams.get("code");
  if (idToken == null) {
    return undefined;
  }
  return {
    idToken,
    code: code ?? undefined,
  };
}

function generateState(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
