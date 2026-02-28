import { h, JSX } from "preact";
import { IJsonLd, Page } from "../../components/page";
import { MathUtils_toWord } from "../../utils/math";
import { StringUtils_capitalize } from "../../utils/string";
import { RepMaxContent } from "./repMaxContent";

interface IProps {
  client: Window["fetch"];
  reps: number | undefined;
  isLoggedIn?: boolean;
}

export function RepMaxHtml(props: IProps): JSX.Element {
  const { client, isLoggedIn, ...data } = props;
  const repsWord = MathUtils_toWord(data.reps);
  const repsNum = data.reps != null ? data.reps : 1;
  const repsLabel = repsWord ? `${StringUtils_capitalize(repsWord)} ` : "";
  const url = `https://www.liftosaur.com/${repsWord ? `${repsWord}-` : ""}rep-max-calculator`;
  const title = `${repsLabel}Rep Max Calculator (${repsNum}RM) - Free & Accurate | Liftosaur`;
  const description = `Free ${repsNum}RM calculator. Enter your weight and reps to instantly calculate your ${repsWord || ""} rep max for bench press, squat, deadlift & all lifts. Uses RPE-based tables for accurate results.`;

  const jsonLd: IJsonLd[] = [
    {
      type: "BreadcrumbList",
      items: [{ name: "Home", url: "https://www.liftosaur.com" }, { name: `${repsLabel}Rep Max Calculator` }],
    },
    {
      type: "SoftwareApplication",
      name: `${repsLabel}Rep Max Calculator - Liftosaur`,
      applicationCategory: "HealthApplication",
      operatingSystem: "iOS, Android, Web",
      url,
      price: "0",
      priceCurrency: "USD",
    },
    {
      type: "FAQPage",
      questions: [
        {
          question: "How accurate are rep max calculators?",
          answer:
            "Calculators give a good estimate, but accuracy decreases as the rep difference grows. Estimating your 1RM from a 3-rep set is more reliable than from a 12-rep set. RPE-based calculations tend to be more accurate than simple formulas because they account for effort level.",
        },
        {
          question: "What is RPE?",
          answer:
            "RPE stands for Rate of Perceived Exertion. It's a scale from 1-10 that measures how hard a set felt. RPE 10 means you couldn't do another rep. RPE 8 means you had about 2 reps left in the tank.",
        },
        {
          question: "Should I test my 1RM directly?",
          answer:
            "Testing a true 1RM is taxing on your body and carries injury risk, especially for beginners. Using a calculator to estimate from a lighter set (e.g. 3-5 reps) is safer and usually accurate enough for programming purposes.",
        },
        {
          question: "What is a Training Max (TM)?",
          answer:
            "A Training Max is a percentage of your 1RM (typically 85-90%) used as the basis for calculating working weights in programs like 5/3/1. It builds in a buffer so you're not always training at your absolute max.",
        },
      ],
    },
  ];

  return (
    <Page
      css={["repmax"]}
      js={["repmax"]}
      maxWidth={1200}
      title={title}
      canonical={url}
      isLoggedIn={!!isLoggedIn}
      description={description}
      ogDescription={description}
      ogUrl={url}
      jsonLd={jsonLd}
      data={data}
      client={client}
    >
      <RepMaxContent {...data} />
    </Page>
  );
}
