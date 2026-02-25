import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { AllExercisesContent } from "./allExercisesContent";

interface IProps {
  client: Window["fetch"];
  isLoggedIn?: boolean;
}

export function AllExercisesHtml(props: IProps): JSX.Element {
  const { client, isLoggedIn, ...data } = props;
  const title = `All exercises | Liftosaur`;
  const url = `https://www.liftosaur.com/exercises`;

  return (
    <Page
      css={["allexercises"]}
      js={["allexercises"]}
      maxWidth={1200}
      title={title}
      canonical={url}
      isLoggedIn={!!isLoggedIn}
      description="List of all available exercises, with their type, target and synergist muscle groups."
      ogUrl={url}
      data={data}
      client={client}
      url="/exercises"
    >
      <AllExercisesContent client={client} {...data} />
    </Page>
  );
}
