import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { IProgram } from "../../types";
import { ProgramDetailsContent } from "./programDetailsContent";

interface IProps {
  selectedProgramId: string;
  programs: IProgram[];
}

export function ProgramDetailsHtml(props: IProps): JSX.Element {
  const { programs, selectedProgramId } = props;
  const program = programs.filter((p) => p.id === selectedProgramId)[0] || programs[0];

  return (
    <Page
      css={["programdetails"]}
      js={["programdetails"]}
      title={`Liftosaur: Program Details - ${program.name}`}
      ogTitle={`Liftosaur: Program Details - ${program.name}`}
      ogDescription="Liftosaur Program Details - What days and exercises the program consists of"
      ogUrl={`https://www.liftosaur.com/programs/${program.id}`}
      ogImage={`https://www.liftosaur.com/programs/${program.id}`}
      data={props}
      postHead={
        <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.21.0/themes/prism.min.css" rel="stylesheet" />
      }
    >
      <ProgramDetailsContent programs={props.programs} selectedProgramId={props.selectedProgramId} />
    </Page>
  );
}
