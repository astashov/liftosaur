import { h, JSX } from "preact";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { ITestimonial, Testimonials_getHighRatingTitles } from "../testimonitals";
import { IconStar } from "../../../components/icons/iconStar";
import { Tailwind_colors } from "../../../utils/tailwindConfig";
import { Platform_isiOS, Platform_isAndroid } from "../../../utils/platform";
import { Onelink } from "../../../components/onelink";
import { track } from "../../../utils/posthog";

export function Hero(props: { userAgent?: string; testimonials: ITestimonial[] }): JSX.Element {
  return (
    <div>
      <div className="relative mx-auto" style={{ maxWidth: 1200 }}>
        <div
          className="flex flex-col px-4 pt-4 pb-12 mx-auto md:flex-row md:items-center md:pb-16 md:pt-8"
          style={{ maxWidth: 1200 }}
        >
          <div className="flex-1 mb-8 md:mb-0 md:pr-8">
            <div className="hidden mb-4 md:block">
              <TopTestimonials testimonials={props.testimonials} />
            </div>
            <h1 className="mb-6 text-3xl font-bold md:text-5xl lg:text-5xl" style={{ lineHeight: 1.2 }}>
              The most powerful weightlifting <span className="text-text-purple">planner</span> and{" "}
              <span className="text-red-500">tracker</span> app
            </h1>
            <p className="mb-6 text-base md:text-lg" style={{ maxWidth: "28rem" }}>
              It's like having <strong>Google Sheets</strong> and <strong>Strong</strong> in the same app! Create custom
              programs or choose proven ones like GZCLP or 5/3/1, trusted by thousands of lifters to get bigger and
              stronger.
            </p>
            <div className="mb-4">
              <StoresLinks userAgent={props.userAgent} />
            </div>
            <div className="block md:hidden">
              <TopTestimonials testimonials={props.testimonials} />
            </div>
          </div>
          <div className="relative flex justify-center flex-1">
            <div className="relative" style={{ width: "271px", height: "555px" }}>
              <div
                className="absolute top-0 left-0 z-10 bg-contain"
                style={{ backgroundImage: "url(/images/iphoneframe.png)", width: "271px", height: "555px" }}
              />
              <video
                className="absolute top-0 left-0 rounded-2xl"
                style={{ width: "248px", height: "535px", top: "10px", left: "12px" }}
                playsInline
                autoPlay
                muted
                loop
                src="/images/mainvideo.mp4"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopTestimonials(props: { testimonials: ITestimonial[] }): JSX.Element {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const titles = useMemo(() => Testimonials_getHighRatingTitles(props.testimonials), [props.testimonials]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const advance = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setIndex((i) => (i + 1) % titles.length);
      setVisible(true);
    }, 300);
  }, [titles.length]);

  const handleClick = useCallback(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    advance();
  }, [advance]);

  useEffect(() => {
    intervalRef.current = setInterval(advance, 3000);
    return () => {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [advance]);

  const stars = Array.from({ length: 5 }, (_, i) => (
    <IconStar
      isSelected={true}
      color={Tailwind_colors().yellow[500]}
      style={{ marginLeft: i !== 0 ? "-0.25rem" : 0 }}
    />
  ));
  return (
    <div>
      <div className="flex items-center gap-2 cursor-pointer" onClick={handleClick}>
        <div className="flex items-center" style={{ gap: "-0.25rem" }}>
          {stars}
        </div>
        <div
          className="text-sm font-semibold"
          style={{ paddingTop: "2px", opacity: visible ? 1 : 0, transition: "opacity 300ms ease" }}
        >
          "{titles[index]}"
        </div>
      </div>
      <div className="leading-none" style={{ marginTop: "-0.125rem", marginLeft: "0.125rem" }}>
        <a
          href="https://apps.apple.com/app/id1661880849?see-all=reviews"
          target="_blank"
          className="text-xs italic text-text-secondary"
        >
          from App Store reviews
        </a>
      </div>
    </div>
  );
}

function StoresLinks(props: { userAgent?: string }): JSX.Element {
  const isiOS = Platform_isiOS(props.userAgent);
  const isAndroid = Platform_isAndroid(props.userAgent);
  const isMobile = isiOS || isAndroid;
  return (
    <div className="flex flex-col items-center md:items-start">
      <div className="flex items-start gap-2">
        {!isMobile && (
          <div style={{ marginTop: "-7px", marginLeft: "-7px" }}>
            <img
              src="/images/store-qr-code.png"
              alt="QR code for app stores"
              style={{ width: "126px", height: "126px" }}
            />
          </div>
        )}
        <div className="flex flex-col gap-1">
          {(!isMobile || isiOS) && (
            <Onelink
              target="_blank"
              className="inline-block overflow-hidden rounded-xl apple-store-link"
              style={{ width: "165px", height: "55px" }}
              type={isMobile ? undefined : "ios"}
              onClick={() => track({ redditname: "Lead", googlename: "outbound_click" })}
            >
              <img
                src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83&amp;releaseDate=1673481600"
                alt="Download on the App Store"
                style={{ width: "165px", height: "55px" }}
                className="rounded-xl"
              />
            </Onelink>
          )}
          {(!isMobile || isAndroid) && (
            <Onelink
              target="_blank"
              className="google-play-link"
              onClick={() => track({ redditname: "Lead", googlename: "outbound_click" })}
              type={isMobile ? undefined : "android"}
            >
              <img
                alt="Get it on Google Play"
                src="/images/googleplay.png"
                style={{ width: "165px", height: "50px" }}
              />
            </Onelink>
          )}
        </div>
      </div>
      <div className="mt-2 text-sm">
        <span className="text-gray-500">or</span>{" "}
        <a href="/app" target="_blank" className="font-bold text-purple-600 underline">
          use as a web app
        </a>
      </div>
    </div>
  );
}
