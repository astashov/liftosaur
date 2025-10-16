import { h, JSX } from "preact";
import { track } from "../../../utils/posthog";
import { Platform } from "../../../utils/platform";

interface IProgramDetailsUpsellProps {
  userAgent?: string;
}

export function ProgramDetailsUpsell(props: IProgramDetailsUpsellProps): JSX.Element {
  const isiOS = Platform.isiOS(props.userAgent);
  const isAndroid = Platform.isAndroid(props.userAgent);
  const isMobile = isiOS || isAndroid;
  const onelink = Platform.onelink();
  return (
    <div className="flex flex-col items-center px-8 py-4 mx-4 mb-4 bg-yellow-100 border border-orange-400 rounded-lg sm:flex-row">
      <div className="flex-1">
        You can use this program on <strong>Liftosaur</strong> - a weightlifting tracker app!
        <ul className="pl-4 mt-2 list-disc">
          <li>Log your workouts there, and have a history of all your workouts on your phone</li>
          <li>
            It will automatically update weights, reps and sets for you from workout to workout - according to the
            program logic
          </li>
          <li>
            And you can customize the programs in any way, change exercises, the exercise logic, sets/reps/weights, etc.
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
                  href={onelink}
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
                  href={onelink}
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
    </div>
  );
}
