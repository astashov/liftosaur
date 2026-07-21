import { JSX, useState } from "react";
import { Service } from "../../api/service";
import { Button } from "../../components/button";
import { IconSpinner } from "../../components/icons/iconSpinner";
import { FooterPage } from "../../components/footerPage";
import { TopNavMenu } from "../../components/topNavMenu";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

export interface IVerifyEmailContentProps {
  client: Window["fetch"];
  token?: string;
}

export function VerifyEmailContent(props: IVerifyEmailContentProps): JSX.Element {
  const service = new Service(props.client);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [success, setSuccess] = useState(false);

  async function submit(): Promise<void> {
    setError(undefined);
    setIsSubmitting(true);
    const result = await service.verifyEmail(props.token || "");
    setIsSubmitting(false);
    if (result.error) {
      setError(
        result.error === "network_error" ? "Network error, please try again" : "This link is invalid or expired."
      );
    } else {
      setSuccess(true);
    }
  }

  return (
    <div style={{ maxWidth: 1200 }} className="mx-auto">
      <div className="mx-4 md:mx-8">
        <TopNavMenu client={props.client} isLoggedIn={false} maxWidth={1200} />
        <div className="py-8 mx-auto" style={{ maxWidth: "24rem" }}>
          <div className="w-full mx-auto" style={{ minWidth: 256, maxWidth: 416 }}>
            <div className="mb-4 text-lg font-bold text-center">Verify your email</div>
            {success ? (
              <div className="flex flex-col items-center">
                <div className="text-center text-text-secondary">Email verified!</div>
                <a className="mt-4 font-bold underline text-text-link" href="/">
                  Back to Liftosaur
                </a>
              </div>
            ) : (
              <div>
                <div className="text-center text-text-secondary">
                  Click the button below to confirm your email address.
                </div>
                {error && <div className="mt-2 text-xs text-center text-text-error">{error}</div>}
                <div className="flex flex-col items-center mt-4">
                  <Button
                    name="verify-email-submit"
                    kind="purple"
                    testID="verify-email-submit"
                    data-testid="verify-email-submit"
                    className="min-w-32"
                    disabled={isSubmitting}
                    onClick={() => submit()}
                  >
                    {isSubmitting ? (
                      <IconSpinner width={20} height={20} color={Tailwind_semantic().text.alwayswhite} />
                    ) : (
                      "Confirm"
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
