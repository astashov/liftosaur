import { h, JSX } from "preact";
import { IJsonLd, Page } from "../../components/page";
import { IAccount } from "../../models/account";
import { IProgramIndexEntry } from "../../models/program";
import { IProgram, ISettings } from "../../types";
import { ProgramDetailsContent } from "./programDetailsContent";

interface IProps {
  program: IProgram;
  fullDescription?: string;
  userAgent?: string;
  client: Window["fetch"];
  account?: IAccount;
  accountSettings?: ISettings;
  indexEntry?: IProgramIndexEntry;
}

export function ProgramDetailsHtml(props: IProps): JSX.Element {
  const { program, indexEntry } = props;
  const { client, ...data } = props;
  const title = `${program.name} Workout Program - Free Tracker & Guide | Liftosaur`;
  const url = `https://www.liftosaur.com/programs/${program.id}`;
  const description = buildMetaDescription(program, indexEntry);
  const jsonLd = buildJsonLd(program, indexEntry, url, description);

  return (
    <Page
      css={["programdetails"]}
      js={["programdetails"]}
      title={title}
      description={description}
      ogDescription={description}
      canonical={url}
      ogUrl={url}
      ogImage={`https://www.liftosaur.com/programimage/${program.id}`}
      jsonLd={jsonLd}
      maxWidth={1200}
      maxBodyWidth={10000}
      data={data}
      postHead={
        <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.21.0/themes/prism.min.css" rel="stylesheet" />
      }
      client={client}
      account={props.account}
    >
      <ProgramDetailsContent {...props} client={props.client} />
    </Page>
  );
}

function buildMetaDescription(program: IProgram, indexEntry?: IProgramIndexEntry): string {
  const short = indexEntry?.shortDescription || program.shortDescription || program.description;
  if (!short) {
    return `${program.name} workout program - exercises, sets, reps, muscles worked, and progressive overload. Free on Liftosaur.`;
  }
  const suffix = ` Free on Liftosaur.`;
  const maxLen = 155 - suffix.length;
  const trimmed = short.length > maxLen ? short.substring(0, maxLen - 3) + "..." : short;
  return trimmed + suffix;
}

function buildJsonLd(
  program: IProgram,
  indexEntry: IProgramIndexEntry | undefined,
  url: string,
  description: string
): IJsonLd[] {
  const article: IJsonLd = {
    type: "Article",
    headline: `${program.name} Workout Program`,
    description,
    author: program.author,
    image: `https://www.liftosaur.com/programimage/${program.id}`,
    mainEntityOfPage: url,
  };

  const breadcrumbs: IJsonLd = {
    type: "BreadcrumbList",
    items: [
      { name: "Home", url: "https://www.liftosaur.com" },
      { name: "Programs", url: "https://www.liftosaur.com/programs" },
      { name: `${program.name} Program` },
    ],
  };

  const app: IJsonLd = {
    type: "SoftwareApplication",
    name: `Liftosaur - ${program.name} Tracker`,
    applicationCategory: "HealthApplication",
    operatingSystem: "iOS, Android, Web",
    url: "https://www.liftosaur.com",
    price: "0",
    priceCurrency: "USD",
    ...(indexEntry?.frequency
      ? { featureList: `${program.name} program, ${indexEntry.frequency}x/week, automatic progressive overload` }
      : {}),
  };

  return [article, breadcrumbs, app];
}
