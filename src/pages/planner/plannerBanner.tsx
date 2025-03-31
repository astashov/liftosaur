import { h, JSX, Fragment } from "preact";
import { Button } from "../../components/button";
import { IconLink } from "../../components/icons/iconLink";
import { IAccount } from "../../models/account";
import { IconSpinner } from "../../components/icons/iconSpinner";

interface IPlannerBannerProps {
  account?: IAccount;
  isBannerLoading: boolean;
  onAddProgram: () => void;
}

export function PlannerBanner(props: IPlannerBannerProps): JSX.Element {
  return (
    <div className="flex flex-col items-center px-8 py-4 mb-4 text-sm bg-yellow-100 border border-orange-400 rounded-lg  sm:mr-64 sm:flex-row">
      {props.account ? (
        <LoggedInGuideBanner isBannerLoading={props.isBannerLoading} onAddProgram={props.onAddProgram} />
      ) : (
        <LoggedOutGuideBanner />
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

function LoggedOutGuideBanner(): JSX.Element {
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
        <div>
          <a
            href="https://apps.apple.com/app/apple-store/id1661880849?pt=126680920&mt=8"
            target="_blank"
            style="display: inline-block; overflow: hidden; border-radius: 13px"
          >
            <img
              className="w-32"
              src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83&amp;releaseDate=1673481600"
              alt="Download on the App Store"
              style="border-radius: 13px"
            />
          </a>
        </div>
        <div style={{ marginTop: "-6px" }}>
          <a
            target="_blank"
            href="https://play.google.com/store/apps/details?id=com.liftosaur.www.twa&pcampaignid=pcampaignidMKT-Other-global-all-co-prtnr-py-PartBadge-Mar2515-1"
          >
            <img
              className="w-40"
              alt="Get it on Google Play"
              src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
            />
          </a>
        </div>
      </div>
    </>
  );
}
