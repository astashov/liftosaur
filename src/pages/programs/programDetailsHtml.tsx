import { h, JSX } from "preact";
import MarkdownIt from "markdown-it";
import { IJsonLd, IJsonLdFAQEntry, Page } from "../../components/page";
import { IAccount } from "../../models/account";
import { IProgramIndexEntry } from "../../models/program";
import { IProgram, ISettings } from "../../types";
import { ProgramDetailsContent } from "./programDetailsContent";

interface IProps {
  program: IProgram;
  fullDescription?: string;
  faq?: string;
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
  const faqEntries = props.faq ? parseFaqMarkdown(props.faq) : [];
  const jsonLd = buildJsonLd(program, indexEntry, url, description, faqEntries);

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

export function parseFaqMarkdown(faqMd: string): IJsonLdFAQEntry[] {
  const md = new MarkdownIt({ html: true, linkify: true });
  const entries: IJsonLdFAQEntry[] = [];
  const lines = faqMd.split("\n");
  let currentQuestion: string | undefined;
  let currentAnswer: string[] = [];

  for (const line of lines) {
    const questionMatch = line.match(/^###\s+(.+)/);
    if (questionMatch) {
      if (currentQuestion && currentAnswer.length > 0) {
        const html = md.renderInline(currentAnswer.join(" ").trim());
        entries.push({ question: currentQuestion, answer: html });
      }
      currentQuestion = questionMatch[1].trim();
      currentAnswer = [];
    } else if (currentQuestion) {
      const trimmed = line.trim();
      if (trimmed) {
        currentAnswer.push(trimmed);
      }
    }
  }
  if (currentQuestion && currentAnswer.length > 0) {
    const html = md.renderInline(currentAnswer.join(" ").trim());
    entries.push({ question: currentQuestion, answer: html });
  }
  return entries;
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
  description: string,
  faqEntries: IJsonLdFAQEntry[]
): IJsonLd[] {
  const article: IJsonLd = {
    type: "Article",
    headline: `${program.name} Workout Program`,
    description,
    author: program.author,
    image: `https://www.liftosaur.com/programimage/${program.id}`,
    mainEntityOfPage: url,
    ...(indexEntry?.datePublished ? { datePublished: indexEntry.datePublished } : {}),
    ...(indexEntry?.dateModified ? { dateModified: indexEntry.dateModified } : {}),
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

  const result: IJsonLd[] = [article, breadcrumbs, app];
  if (faqEntries.length > 0) {
    result.push({ type: "FAQPage", questions: faqEntries });
  }
  return result;
}
