import { h, JSX, Fragment } from "preact";
import { Button } from "../../components/button";
import { IconLink } from "../../components/icons/iconLink";
import { IAccount } from "../../models/account";
import { IconSpinner } from "../../components/icons/iconSpinner";
import { track } from "../../utils/posthog";
import { Platform } from "../../utils/platform";

interface IPlannerBannerProps {
  account?: IAccount;
  isBannerLoading: boolean;
  userAgent?: string;
  onAddProgram: () => void;
}

export function PlannerBanner(props: IPlannerBannerProps): JSX.Element {
  return (
    <div className="flex flex-col items-center px-8 py-4 mb-4 text-sm border border-orange-400 rounded-lg bg-yellow-50 sm:mr-64 sm:flex-row">
      {props.account ? (
        <LoggedInGuideBanner isBannerLoading={props.isBannerLoading} onAddProgram={props.onAddProgram} />
      ) : (
        <LoggedOutGuideBanner userAgent={props.userAgent} />
      )}
    </div>
  );
}

function LoggedInGuideBanner(props: { onAddProgram: () => void; isBannerLoading: boolean }): JSX.Element {
  return (
    <div className="flex-1">
      To use this program:
      <div>
        <Button style={{ width: "18rem" }} kind="purple" name="add-program-to-account" onClick={props.onAddProgram}>
          {props.isBannerLoading ? <IconSpinner width={20} height={20} /> : "Add this program to your account"}
        </Button>
      </div>
      <div className="font-bold">OR</div>
      <ul className="pl-4 list-disc">
        <li>
          Copy the link to this program by clicking on <IconLink className="inline-block" size={16} /> below
        </li>
        <li>
          Import the link in the app, on the <strong>Choose Program</strong> screen.
        </li>
      </ul>
    </div>
  );
}

function LoggedOutGuideBanner(props: { userAgent?: string }): JSX.Element {
  const isiOS = Platform.isiOS(props.userAgent);
  const isAndroid = Platform.isAndroid(props.userAgent);
  const isMobile = isiOS || isAndroid;
  return (
    <>
      <div className="flex-1">
        To use this program:
        <ul className="pl-4 list-disc">
          <li>Install Liftosaur app</li>
          <li>
            Copy the link to this program by clicking on <IconLink className="inline-block" size={16} /> below
          </li>
          <li>
            Import the link in the app, on the <strong>Choose Program</strong> screen.
          </li>
        </ul>
      </div>
      <div className="flex items-center mt-2 ml-4">
        <div className="flex justify-center md:justify-start">
          {!isMobile && (
            <div style={{ marginTop: "-7px", marginLeft: "-7px" }}>
              <img
                src="/images/store-qr-code.png"
                alt="QR code for app stores"
                style={{ width: "90px", height: "90px" }}
              />
            </div>
          )}
          <div>
            {(!isMobile || isiOS) && (
              <div>
                <a
                  href="https://liftosaur.onelink.me/cG8a/aylyqael"
                  className="inline-block overflow-hidden rounded-xl apple-store-link"
                  style={{ width: "120px", height: "40px" }}
                  onClick={() => track({ redditname: "Lead", googlename: "outbound_click" })}
                >
                  <img
                    src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83&amp;releaseDate=1673481600"
                    alt="Download on the App Store"
                    style={{ width: "120px", height: "40px" }}
                    className="rounded-xl"
                  />
                </a>
              </div>
            )}
            {(!isMobile || isAndroid) && (
              <div>
                <a
                  target="_blank"
                  className="google-play-link"
                  href="https://liftosaur.onelink.me/cG8a/aylyqael"
                  onClick={() => track({ redditname: "Lead", googlename: "outbound_click" })}
                >
                  <img
                    alt="Get it on Google Play"
                    src="/images/googleplay.png"
                    style={{
                      width: "120px",
                      height: "35px",
                    }}
                  />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
