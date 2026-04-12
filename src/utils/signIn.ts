export interface IGoogleSignInResult {
  idToken?: string;
  accessToken?: string;
}

export interface IAppleSignInResult {
  idToken: string;
  code?: string;
}

export async function SignIn_google(): Promise<IGoogleSignInResult | undefined> {
  throw new Error("SignIn_google is only supported on native platforms");
}

export async function SignIn_apple(): Promise<IAppleSignInResult | undefined> {
  throw new Error("SignIn_apple is only supported on native platforms");
}
