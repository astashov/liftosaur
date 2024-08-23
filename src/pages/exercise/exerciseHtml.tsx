import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { IAccount } from "../../models/account";
import { Exercise } from "../../models/exercise";
import { ExerciseImageUtils } from "../../models/exerciseImage";
import { IExerciseType } from "../../types";
import { ExerciseContent } from "./exerciseContent";

interface IProps {
  client: Window["fetch"];
  id: string;
  exerciseType: IExerciseType;
  filterTypes: string[];
  account?: IAccount;
}

export function ExerciseHtml(props: IProps): JSX.Element {
  const { client, id, ...data } = props;
  const exercise = Exercise.get(data.exerciseType, {});
  const name = Exercise.reverseName(exercise);
  const title = `${name} | Liftosaur`;
  const url = `https://www.liftosaur.com/exercise/${id}`;

  return (
    <Page
      css={["exercise"]}
      js={["exercise"]}
      nowrapper={true}
      maxWidth={1200}
      title={title}
      canonical={url}
      account={props.account}
      description="Description of the exercise, how to perform it with proper form, muscles worked, and with what exercises you can substitute it."
      ogUrl={url}
      ogImage={`https://www.liftosaur.com${ExerciseImageUtils.ogImageUrl(data.exerciseType)}`}
      data={data}
      client={client}
    >
      <ExerciseContent client={client} {...data} />
    </Page>
  );
}
