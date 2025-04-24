import { h, JSX } from "preact";
import { Thunk } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { Button } from "./button";
import { IconArrowRight } from "./icons/iconArrowRight";
import StorySlider from "./storySlider";
import { IconKettlebell } from "./icons/iconKettlebell";
import { Tailwind } from "../utils/tailwindConfig";
import { IconWorkoutProgress } from "./icons/iconWorkoutProgress";
import { IconEditor } from "./icons/iconEditor";
import { IconTracker } from "./icons/iconTracker";
import { useState } from "preact/hooks";
import { Modal } from "./modal";
import { Account } from "./account";
import { IAccount } from "../models/account";

interface IProps {
  account?: IAccount;
  client: Window["fetch"];
  dispatch: IDispatch;
}

export function ScreenFirst(props: IProps): JSX.Element {
  const [showAccountModal, setShowAccountModal] = useState(false);
  return (
    <section className="flex flex-col h-screen text-blackv2">
      <div className="flex-1 px-4 pt-16 pb-4">
        <StorySlider
          slides={[
            <FirstSlide />,
            <RestSlide
              bgColorHexFrom={Tailwind.colors().purplev3[200]}
              bgColorHexTo={Tailwind.colors().purplev3[100]}
              bgColor="bg-purplev3-100"
              borderColor="border-purplev3-200"
              header={
                <span>
                  <IconKettlebell color={Tailwind.colors().purplev3.main} className="inline-block mr-1 align-middle" />
                  <span className="align-middle text-purplev3-main">Weightlifting Programs</span>
                </span>
              }
              bodyText="Start with a pre-built weightlifting program, or create your own."
              image="slide-2-image"
            />,
            <RestSlide
              bgColorHexFrom={Tailwind.colors().yellowv3[200]}
              bgColorHexTo={Tailwind.colors().yellowv3[100]}
              bgColor="bg-yellowv3-100"
              borderColor="border-yellowv3-200"
              header={
                <span>
                  <IconWorkoutProgress
                    color={Tailwind.colors().yellowv3.main}
                    className="inline-block mr-1 align-middle"
                  />
                  <span className="align-middle text-yellowv3-main">Workout Tracker</span>
                </span>
              }
              bodyText="Log sets with one tap. Your reps and weight adjust automatically."
              image="slide-3-image"
            />,
            <RestSlide
              bgColorHexFrom={Tailwind.colors().purplev3[200]}
              bgColorHexTo={Tailwind.colors().purplev3[100]}
              bgColor="bg-purplev3-100"
              borderColor="border-purplev3-200"
              header={
                <span>
                  <IconEditor color={Tailwind.colors().purplev3.main} className="inline-block mr-1 align-middle" />
                  <span className="align-middle text-purplev3-main">Program Editor</span>
                </span>
              }
              bodyText="Modify or switch any program anytime to fit your goals."
              image="slide-4-image"
            />,
            <RestSlide
              bgColorHexFrom={Tailwind.colors().redv3[200]}
              bgColorHexTo={Tailwind.colors().redv3[100]}
              bgColor="bg-redv3-100"
              borderColor="border-redv3-200"
              header={
                <span>
                  <IconTracker color={Tailwind.colors().redv3.main} className="inline-block mr-1 align-middle" />
                  <span className="align-middle text-redv3-main">Workout History</span>
                </span>
              }
              bodyText="Track your weekly stats to stay on target! "
              image="slide-5-image"
            />,
          ]}
          duration={5000}
        />
      </div>
      <div className="safe-area-inset-bottom">
        <div className="pb-6 mx-4 text-center">
          <div>
            <Button
              className="w-full"
              name="see-how-it-works"
              kind="purple"
              onClick={() => props.dispatch(Thunk.pushScreen("units"))}
            >
              <span className="align-middle">Get started</span>{" "}
              <IconArrowRight className="inline ml-2 align-middle left-right-animation" color="white" />
            </Button>
          </div>
          <div className="mt-2">
            <Button
              className="w-full"
              name="see-how-it-works"
              kind="transparent-purple"
              onClick={() => setShowAccountModal(true)}
            >
              I have an account
            </Button>
          </div>
        </div>
      </div>
      {showAccountModal && (
        <Modal onClose={() => setShowAccountModal(false)} shouldShowClose={true}>
          <Account account={props.account} client={props.client} dispatch={props.dispatch} />
        </Modal>
      )}
    </section>
  );
}

function FirstSlide(): JSX.Element {
  return (
    <div
      className="relative flex flex-col w-full h-full rounded-2xl"
      style={{
        background: "url('/images/slide-1-bg.jpg') no-repeat center center",
        backgroundSize: "cover",
      }}
    >
      <div className="px-8 pt-24 font-bold text-white" style={{ fontSize: "2rem", lineHeight: "1.1" }}>
        The most powerful weightlifting <span style={{ color: "#946AFF" }}>planner</span> and{" "}
        <span style={{ color: "#FF775D" }}>tracker</span> app
      </div>
      <div className="px-8 py-6 text-base font-normal text-white">
        Build any weightlifting program using a simple scripting language and track your progress.
      </div>
      <div
        className="flex items-center justify-center flex-1 w-full bg-cover"
        style={{ background: "url(/images/logo.svg) center center no-repeat" }}
      ></div>
    </div>
  );
}

interface IRestSlideProps {
  bgColorHexFrom: string;
  bgColorHexTo: string;
  bgColor: string;
  borderColor: string;
  header: JSX.Element;
  bodyText: string;
  image: string;
}

function RestSlide(props: IRestSlideProps): JSX.Element {
  return (
    <div
      className={`flex flex-col w-full h-full overflow-hidden border ${props.borderColor} rounded-2xl ${props.bgColor}`}
    >
      <div
        className="h-12 px-8"
        style={{
          background: `linear-gradient(to bottom, ${props.bgColorHexFrom} 0%, ${props.bgColorHexTo} 100%`,
        }}
      ></div>
      <div className="px-8 font-semibold text-center">{props.header}</div>
      <div className="px-8 py-6 text-xl font-semibold text-center">{props.bodyText}</div>
      <div
        className="flex items-center justify-center flex-1 w-full bg-no-repeat bg-contain"
        style={{ backgroundImage: `url(/images/${props.image}.png)`, backgroundPosition: "center center" }}
      ></div>
    </div>
  );
}
