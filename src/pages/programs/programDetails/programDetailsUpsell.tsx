import { h, JSX } from "preact";

export function ProgramDetailsUpsell(): JSX.Element {
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
    </div>
  );
}
