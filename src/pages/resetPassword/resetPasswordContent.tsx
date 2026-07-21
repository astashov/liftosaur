import { JSX, useRef, useState } from "react";
import { Service } from "../../api/service";
import { Button } from "../../components/button";
import { Input } from "../../components/input";
import { IconSpinner } from "../../components/icons/iconSpinner";
import { FooterPage } from "../../components/footerPage";
import { TopNavMenu } from "../../components/topNavMenu";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

export interface IResetPasswordContentProps {
  client: Window["fetch"];
  token?: string;
}

const errorMessages: Record<string, string> = {
  invalid_token: "This link is invalid or expired. Request a new one from the login page.",
  invalid_password: "Password must be at least 8 characters",
  password_too_long: "Password must be at most 256 characters",
  network_error: "Network error, please try again",
};

export function ResetPasswordContent(props: IResetPasswordContentProps): JSX.Element {
  const service = new Service(props.client);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isDone, setIsDone] = useState(false);
  const passwordRef = useRef("");
  const password2Ref = useRef("");

  async function submit(): Promise<void> {
    const password = passwordRef.current;
    setError(undefined);
    if (password.length < 8) {
      setError(errorMessages.invalid_password);
      return;
    }
    if (password.length > 256) {
      setError(errorMessages.password_too_long);
      return;
    }
    if (password !== password2Ref.current) {
      setError("Passwords don't match");
      return;
    }
    setIsSubmitting(true);
    const result = await service.resetPassword(props.token || "", password);
    setIsSubmitting(false);
    if (result.error) {
      setError(errorMessages[result.error] || "Something went wrong, please try again");
    } else {
      setIsDone(true);
    }
  }

  return (
    <div style={{ maxWidth: 1200 }} className="mx-auto">
      <div className="mx-4 md:mx-8">
        <TopNavMenu client={props.client} isLoggedIn={false} maxWidth={1200} />
        <div className="py-8 mx-auto" style={{ maxWidth: "24rem" }}>
          <div className="w-full mx-auto" style={{ minWidth: 256, maxWidth: 416 }}>
            <div className="mb-4 text-lg font-bold text-center">Set a new password</div>
            {isDone ? (
              <div className="flex flex-col items-center">
                <div className="text-center text-text-secondary">
                  Password updated! You can now sign in with your new password.
                </div>
                <a className="mt-4 font-bold underline text-text-link" href="/login">
                  Back to Liftosaur
                </a>
              </div>
            ) : (
              <div>
                <Input
                  label="New password"
                  identifier="reset-password"
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
                <div className="mt-2">
                  <Input
                    label="Repeat new password"
                    identifier="reset-password2"
                    type="password"
                    changeType="oninput"
                    autoCapitalize="none"
                    autoCorrect={false}
                    changeHandler={(r) => {
                      if (r.success) {
                        password2Ref.current = r.data;
                      }
                    }}
                  />
                </div>
                {error && <div className="mt-2 text-xs text-text-error">{error}</div>}
                <div className="flex flex-col items-center mt-4">
                  <Button
                    name="reset-password-submit"
                    kind="purple"
                    testID="reset-password-submit"
                    data-testid="reset-password-submit"
                    className="min-w-32"
                    disabled={isSubmitting}
                    onClick={() => submit()}
                  >
                    {isSubmitting ? (
                      <IconSpinner width={20} height={20} color={Tailwind_semantic().text.alwayswhite} />
                    ) : (
                      "Set Password"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        <FooterPage maxWidth={1200} />
      </div>
    </div>
  );
}
