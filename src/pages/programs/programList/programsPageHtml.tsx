import { h, JSX } from "preact";
import { IJsonLd, Page } from "../../../components/page";
import { IAccount } from "../../../models/account";
import { ProgramsPageContent } from "../programsPageContent";
import { IProgramIndexEntry } from "../../../models/program";

interface IProps {
  programs: IProgramIndexEntry[];
  account?: IAccount;
  client: Window["fetch"];
}

export function ProgramsPageHtml(props: IProps): JSX.Element {
  const { client, ...data } = props;
  const count = props.programs.length;
  const title = `${count}+ Free Weightlifting Programs & Workout Plans | Liftosaur`;
  const url = "https://www.liftosaur.com/programs";
  const description = `Browse ${count}+ free weightlifting programs including GZCLP, 5/3/1, nSuns, PPL, and more. Filter by experience level, frequency, and goals. Run any program with automatic progressive overload tracking.`;

  const jsonLd: IJsonLd[] = [
    {
      type: "ItemList",
      name: "Weightlifting Programs",
      items: props.programs.map((p) => ({
        name: p.name,
        url: `https://www.liftosaur.com/programs/${p.id}`,
      })),
    },
    {
      type: "BreadcrumbList",
      items: [
        { name: "Home", url: "https://www.liftosaur.com" },
        { name: "Programs" },
      ],
    },
  ];

  return (
    <Page
      css={["allprograms"]}
      js={["allprograms"]}
      maxWidth={1200}
      title={title}
      canonical={url}
      account={props.account}
      description={description}
      ogDescription={description}
      ogUrl={url}
      jsonLd={jsonLd}
      data={data}
      client={client}
      url="/programs"
    >
      <ProgramsPageContent client={client} {...data} />
    </Page>
  );
}
