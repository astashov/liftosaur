import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { MockAudioInterface } from "../../lib/audioInterface";
import { IProgram } from "../../types";
import { ProgramDetailsContent } from "./programDetailsContent";

interface IProps {
  selectedProgramId: string;
  programs: IProgram[];
  fullDescription?: string;
  userAgent?: string;
  client: Window["fetch"];
}

export function ProgramDetailsHtml(props: IProps): JSX.Element {
  const { programs, selectedProgramId } = props;
  const program = programs.filter((p) => p.id === selectedProgramId)[0] || programs[0];
  const audio = new MockAudioInterface();
  const { client, ...data } = props;
  const title = `${program.name} program explained | Liftosaur`;
  const url = `https://www.liftosaur.com/programs/${program.id}`;

  return (
    <Page
      css={["programdetails"]}
      js={["programdetails"]}
      title={title}
      description={`Weightlifting program details - exercises, sets, reps, muscles worked, progressive overload, etc`}
      canonical={url}
      ogUrl={url}
      ogImage={`https://www.liftosaur.com/programimage/${program.id}`}
      maxWidth={1020}
      data={data}
      postHead={
        <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.21.0/themes/prism.min.css" rel="stylesheet" />
      }
      client={client}
    >
      <ProgramDetailsContent
        userAgent={props.userAgent}
        programs={props.programs}
        fullDescription={props.fullDescription}
        selectedProgramId={props.selectedProgramId}
        client={props.client}
        audio={audio}
      />
    </Page>
  );
}
